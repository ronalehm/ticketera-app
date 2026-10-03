import { describe, expect, it } from "vitest";
import { publicEnvSchema } from "./env";

describe("publicEnvSchema", () => {
  it("deja la clave undefined si la variable no existe", () => {
    expect(
      publicEnvSchema.parse({}).NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY,
    ).toBeUndefined();
  });

  it("trata una cadena vacía como ausente", () => {
    expect(
      publicEnvSchema.parse({ NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY: "" })
        .NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY,
    ).toBeUndefined();
  });

  it("trata una cadena con solo espacios como ausente", () => {
    expect(
      publicEnvSchema.parse({ NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY: "   " })
        .NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY,
    ).toBeUndefined();
  });

  it("recorta los espacios de una clave con valor", () => {
    expect(
      publicEnvSchema.parse({ NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY: " abc " })
        .NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY,
    ).toBe("abc");
  });
});
