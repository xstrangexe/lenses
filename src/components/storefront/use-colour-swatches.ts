import { useRef } from "react";
import type { CatalogueVariant } from "@/lib/queries";
import { imagesForColour, type ColourOption } from "@/lib/variant-options";

/**
 * Colour choices with their first photo, and a pick that keeps the photo in
 * view: on a phone the gallery sits above the picker, so a tap scrolls it back
 * and the buyer sees the colour change instead of guessing.
 */
export function useColourSwatches(
  variants: CatalogueVariant[],
  colours: ColourOption[],
  pickColour: (colour: string) => void,
) {
  const galleryRef = useRef<HTMLDivElement>(null);
  const swatches = colours.map((c) => ({
    ...c,
    image: imagesForColour(variants, c.name)[0] ?? null,
  }));

  const chooseColour = (colour: string) => {
    pickColour(colour);
    const box = galleryRef.current?.getBoundingClientRect();
    if (box && box.bottom < 120 && window.matchMedia("(max-width: 1023px)").matches) {
      // After the new photo renders, or the re-render cancels the smooth scroll.
      window.setTimeout(() => {
        const top = (galleryRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY;
        window.scrollTo({ top: top - 72, behavior: "smooth" });
      }, 60);
    }
  };

  return { galleryRef, swatches, chooseColour };
}
