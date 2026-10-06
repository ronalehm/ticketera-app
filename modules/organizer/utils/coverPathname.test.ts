import { describe, expect, it } from "vitest";
import { buildCoverPathname, type CoverMime, parseCoverPathname } from "./coverPathname";

const EVENT_ID = "3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b";
const FILE_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

describe("buildCoverPathname", () => {
  it.each<[CoverMime, string]>([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ])("%s → .%s, y lo que construye se vuelve a leer con el mismo MIME", (mime, ext) => {
    const pathname = buildCoverPathname(EVENT_ID, mime);
    expect(pathname).toMatch(new RegExp(`^events/${EVENT_ID}/[0-9a-f-]{36}\\.${ext}$`));
    expect(parseCoverPathname(pathname)).toEqual({ eventId: EVENT_ID, mime });
  });

  it("genera un uuid distinto en cada llamada", () => {
    expect(buildCoverPathname("draft", "image/png")).not.toBe(buildCoverPathname("draft", "image/png"));
  });
});

describe("parseCoverPathname", () => {
  it("acepta draft (sin evento) y un id de evento", () => {
    expect(parseCoverPathname(`events/draft/${FILE_ID}.jpg`)).toEqual({ eventId: null, mime: "image/jpeg" });
    expect(parseCoverPathname(`events/${EVENT_ID}/${FILE_ID}.webp`)).toEqual({ eventId: EVENT_ID, mime: "image/webp" });
  });

  it.each([
    ["path traversal", `events/../${FILE_ID}.jpg`],
    ["traversal dentro del scope", `events/draft/../${FILE_ID}.jpg`],
    ["barra extra", `events/draft//${FILE_ID}.jpg`],
    ["subcarpeta extra", `events/draft/x/${FILE_ID}.jpg`],
    ["barra inicial", `/events/draft/${FILE_ID}.jpg`],
    ["otro prefijo", `avatars/draft/${FILE_ID}.jpg`],
    ["scope inválido", `events/drafts/${FILE_ID}.jpg`],
    ["scope que no es uuid", `events/123/${FILE_ID}.jpg`],
    ["nombre que no es uuid", "events/draft/foto.jpg"],
    ["extensión no permitida", `events/draft/${FILE_ID}.gif`],
    ["jpeg en vez de jpg", `events/draft/${FILE_ID}.jpeg`],
    ["doble extensión", `events/draft/${FILE_ID}.jpg.png.exe`],
    ["mayúsculas", `events/draft/${FILE_ID}.JPG`],
    ["vacío", ""],
  ])("rechaza %s", (_, pathname) => {
    expect(parseCoverPathname(pathname)).toBeNull();
  });
});
