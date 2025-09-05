import { NextResponse } from "next/server";
import { createMutableServerClient } from "@/lib/supabase/server-mutable";
import { createClient } from "@supabase/supabase-js";
// Emails queued via email_queue now

export const dynamic = "force-dynamic";

async function sha256Hex(buffer: ArrayBuffer) {
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    const sb = await createMutableServerClient();

    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    if (contentType.startsWith("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      const docType = (form.get("doc_type") as string) || "document";

      if (!file)
        return NextResponse.json({ error: "no_file" }, { status: 400 });

      const arrayBuffer = await file.arrayBuffer();
      const hash = await sha256Hex(arrayBuffer);

      // create a storage path: carrier-docs/<hash>-<originalname>
      const filename = `${hash}-${file.name}`.replace(/\s+/g, "_");

      // get carrier_profile
      const { data: carrierProfile } = await sb
        .from("carrier_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!carrierProfile)
        return NextResponse.json(
          { error: "no_carrier_profile" },
          { status: 400 }
        );

      // upload to Supabase storage (bucket: carrier-docs)
      const bucket = "carrier-docs";

      // Prefer using the service role key for server-side storage operations
      const serviceKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const adminClient =
        serviceKey && supabaseUrl
          ? createClient(supabaseUrl, serviceKey)
          : null;

      let uploadResult: any = null;
      let altResult: any = null;
      const storageClient: any = adminClient ? adminClient.storage : sb.storage;
      try {
        // prefer adminClient.storage if available; otherwise use sb.storage
        uploadResult = await storageClient
          .from(bucket)
          .upload(filename, new Blob([arrayBuffer]), {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });
      } catch (e) {
        console.error("storage.upload threw", e);
        // try alternate upload using Buffer (Node)
        try {
          // Buffer is available in Node runtimes
          // @ts-ignore
          const buf = Buffer.from(arrayBuffer);
          altResult = await storageClient.from(bucket).upload(filename, buf, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });
        } catch (e2) {
          console.error("storage.upload alt threw", e2);
          return NextResponse.json(
            { error: "upload_failed", details: String(e), alt: String(e2) },
            { status: 500 }
          );
        }
      }

      // If upload returned an error, try to auto-create the bucket (when admin client is available)
      if (
        (uploadResult && uploadResult.error) ||
        (altResult && altResult.error)
      ) {
        console.error("storage upload error", { uploadResult, altResult });

        // detect bucket-not-found in uploadResult
        const errObj = uploadResult?.error ?? altResult?.error;
        const msg = String(
          errObj?.message || errObj?.msg || errObj || ""
        ).toLowerCase();
        const isBucketNotFound =
          msg.includes("bucket not found") ||
          msg.includes("no such bucket") ||
          errObj?.statusCode === "404" ||
          errObj?.status === 404;

        if (isBucketNotFound && adminClient) {
          console.warn(
            "Bucket not found — attempting to create bucket using service role client",
            bucket
          );
          try {
            const { data: createData, error: createErr } =
              await adminClient.storage.createBucket(bucket, { public: true });
            if (createErr) {
              console.error("createBucket failed", createErr);
              return NextResponse.json(
                {
                  error: "create_bucket_failed",
                  details: JSON.parse(JSON.stringify(createErr)),
                },
                { status: 500 }
              );
            }

            // retry upload once; if file already exists (409) generate a unique filename and try again
            try {
              uploadResult = await storageClient
                .from(bucket)
                .upload(filename, new Blob([arrayBuffer]), {
                  contentType: file.type || "application/octet-stream",
                  upsert: false,
                });
              // if file exists, uploadResult.error will indicate 409 — handle below
            } catch (e) {
              console.error("retry storage.upload threw", e);
              // on error, try alternate Buffer path
              try {
                // @ts-ignore
                const buf = Buffer.from(arrayBuffer);
                altResult = await storageClient
                  .from(bucket)
                  .upload(filename, buf, {
                    contentType: file.type || "application/octet-stream",
                    upsert: false,
                  });
              } catch (e2) {
                console.error("retry storage.upload alt threw", e2);
                return NextResponse.json(
                  {
                    error: "upload_failed",
                    details: String(e),
                    alt: String(e2),
                  },
                  { status: 500 }
                );
              }
            }

            // if still errored after retry, fall through to return details below
          } catch (createEx) {
            console.error("create bucket attempt threw", createEx);
            return NextResponse.json(
              { error: "create_bucket_exception", details: String(createEx) },
              { status: 500 }
            );
          }
        }

        // if the SDK reported the resource already exists, try a unique filename and re-upload
        const detailsObj = {
          uploadResult: uploadResult
            ? JSON.parse(JSON.stringify(uploadResult))
            : null,
          altResult: altResult ? JSON.parse(JSON.stringify(altResult)) : null,
        };

        const conflict =
          detailsObj.uploadResult?.error?.statusCode === "409" ||
          detailsObj.uploadResult?.error?.status === 409;
        if (conflict) {
          const suffix = `-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;
          const uniqueFilename = filename.replace(/(\.[^.]*)?$/, `${suffix}$1`);
          console.warn(
            "File already exists, retrying with unique filename",
            uniqueFilename
          );
          try {
            const retry = await storageClient
              .from(bucket)
              .upload(uniqueFilename, new Blob([arrayBuffer]), {
                contentType: file.type || "application/octet-stream",
                upsert: false,
              });
            if (retry.error) {
              // try Buffer fallback
              try {
                // @ts-ignore
                const buf = Buffer.from(arrayBuffer);
                const retryAlt = await storageClient
                  .from(bucket)
                  .upload(uniqueFilename, buf, {
                    contentType: file.type || "application/octet-stream",
                    upsert: false,
                  });
                if (retryAlt.error) {
                  console.error("retry unique upload failed", retryAlt);
                  return NextResponse.json(
                    {
                      error: "upload_failed",
                      details: {
                        initial: detailsObj,
                        retry: JSON.parse(JSON.stringify(retryAlt)),
                      },
                    },
                    { status: 500 }
                  );
                }
                uploadResult = retryAlt;
              } catch (e3) {
                console.error("retry unique upload alt threw", e3);
                return NextResponse.json(
                  {
                    error: "upload_failed",
                    details: { initial: detailsObj, retryError: String(e3) },
                  },
                  { status: 500 }
                );
              }
            } else {
              uploadResult = retry;
            }
            // continue with finalResult below
          } catch (uniqueEx) {
            console.error("unique filename upload threw", uniqueEx);
            return NextResponse.json(
              {
                error: "upload_failed",
                details: {
                  initial: detailsObj,
                  uniqueException: String(uniqueEx),
                },
              },
              { status: 500 }
            );
          }
        }

        return NextResponse.json(
          { error: "upload_failed", details: detailsObj },
          { status: 500 }
        );
      }

      const finalResult = uploadResult?.data ? uploadResult : altResult;

      // Use admin client to get public URL if available, otherwise fall back
      const urlClient: any = adminClient ? adminClient.storage : sb.storage;
      const publicUrl = urlClient
        .from(bucket)
        .getPublicUrl(finalResult.data.path).data.publicUrl;

      const meta = {
        carrier_profile_id: carrierProfile.id,
        user_id: user.id,
        doc_type: docType,
        file_name: file.name,
        file_path: finalResult.data.path,
        file_hash: hash,
        file_size: arrayBuffer.byteLength,
        mime_type: file.type || null,
        review_status: "pending",
      };

      const { error } = await sb.from("carrier_documents").insert(meta);
      if (error) {
        console.error("DB insert error", error);
        // detect PostgREST schema cache error where table isn't found
        const isMissingTable =
          error?.code === "PGRST205" ||
          String(error?.message || "")
            .toLowerCase()
            .includes("could not find the table 'public.carrier_documents'");
        if (isMissingTable) {
          return NextResponse.json(
            {
              error: "missing_table",
              message:
                "The database table 'carrier_documents' was not found. Run the migration script scripts/008_create_carrier_documents.sql against your database or create the table in Supabase SQL.",
            },
            { status: 500 }
          );
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Email admins on new upload (best-effort)
      // Queue admin notification emails
      try {
        const { data: admins } = await sb
          .from('profiles')
          .select('email')
          .eq('role', 'admin');
        const bypassList = String(process.env.ADMIN_BYPASS_EMAIL || '')
          .split(',')
          .map(s=>s.trim())
          .filter(Boolean);
        const adminEmails = Array.from(new Set([...(admins?.map(a=>a.email).filter(Boolean) || []), ...bypassList]));
        if (adminEmails.length) {
          const subject = `New ${docType} document uploaded`;
          const html = `<p>A new document was uploaded.</p>
            <ul>
              <li>User ID: ${user.id}</li>
              <li>Carrier Profile ID: ${carrierProfile.id}</li>
              <li>Type: ${docType}</li>
              <li>Filename: ${file.name}</li>
              <li>Hash: ${hash.slice(0,12)}...</li>
              <li>Status: pending</li>
            </ul>
            <p>Review it in the admin dashboard.</p>`;
          await Promise.all(adminEmails.map(e=> sb.from('email_queue').insert({ to_address: e, subject, html })));
        }
      } catch (mailErr) {
        console.error('queue admin upload email failed', mailErr);
      }

      return NextResponse.json({ ok: true, url: publicUrl });
    }

    // fallback: accept json metadata
    const body = await req.json();
    body.user_id = body.user_id || user.id;
    body.review_status = body.review_status || "pending";
    const { error } = await sb.from("carrier_documents").insert(body);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const sb = await createMutableServerClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const { data } = await sb
      .from("carrier_documents")
      .select("id, doc_type, file_name, file_path, file_hash, review_status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
