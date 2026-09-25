export async function GET() {
  return Response.json({
    ok: true,
    service: "innovation-os",
    version: "v1",
  });
}
