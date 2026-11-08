import { useState } from "react";
import type { CatalogueVariant } from "@/lib/queries";
import {
  colourAfterModelChange,
  colourOptions,
  coloursForModel,
  findVariant,
  imagesForColour,
  initialChoice,
  modelOptions,
  sizeAfterColourChange,
} from "@/lib/variant-options";
import { productVideos } from "@/lib/product-videos";
import { sizeForModelKey } from "@/lib/phone-models";

/**
 * The buyer's model and colour on a product page, and what follows from them:
 * the variant to order, whether that pair is unavailable, and the gallery.
 *
 * Split out of `product-detail.tsx` at the 120-line function limit; the page
 * keeps the layout, this keeps the choice.
 */
export function useVariantChoice(
  variants: CatalogueVariant[],
  slug: string,
  initialModel?: string,
) {
  const colours = colourOptions(variants);
  const sizes = modelOptions(variants, null);
  // Phone model first, then colour: the page opens with nothing chosen, and the
  // colours appear once the buyer has said which phone they have.
  const modelFirst = colours.length > 0 && sizes.length > 1;
  const [choice, setChoice] = useState<{ colour: string | null; size: string | null }>(() => {
    // Several colours: nothing is chosen for the buyer, so she never orders a
    // colour she did not pick. A single colour is chosen for her.
    if (!modelFirst)
      return colours.length > 1 ? { colour: null, size: null } : initialChoice(variants);
    // A link from the stock page can name the buyer's model: open on it.
    const size = sizeForModelKey(sizes, initialModel);
    return { colour: size ? colourAfterModelChange(variants, size, null) : null, size };
  });
  const [activeImage, setActiveImage] = useState(0);
  const colourChoices =
    modelFirst && choice.size === null ? [] : coloursForModel(colours, variants, choice.size);
  // No variant until every option shown is chosen: `findVariant` treats a null
  // size as "any size", which would quietly order the first model in the list.
  const choiceComplete =
    (colours.length === 0 || choice.colour !== null) &&
    (sizes.length === 0 || choice.size !== null);
  const selected = choiceComplete ? findVariant(variants, choice.colour, choice.size) : null;
  // A colour and model that do not exist together (or are out of stock).
  const unavailable = choiceComplete && (!selected || selected.stock <= 0);
  // The gallery follows the colour. With no colour photos, fall back to all.
  const colourImages = imagesForColour(variants, choice.colour);
  const photos = colourImages.length > 0 ? colourImages : imagesForColour(variants, null);
  // The first clip opens the gallery; the rest follow the photos. Picking a
  // colour jumps to its first photo, not back to the clip.
  const videos = productVideos(slug);
  const lead = Math.min(videos.length, 1);
  const images = [...videos.slice(0, lead), ...photos, ...videos.slice(lead)];

  const pickColour = (colour: string) => {
    setChoice({ colour, size: choice.size ?? sizeAfterColourChange(variants, colour, null) });
    setActiveImage(lead);
  };
  const pickSize = (size: string) => {
    // Keep the colour if this phone comes in it, pick it if there is only one,
    // otherwise clear it so the buyer chooses from what exists.
    const colour = colourAfterModelChange(variants, size, choice.colour);
    setChoice({ colour, size });
    if (colour !== choice.colour) setActiveImage(lead);
  };

  return {
    colours,
    sizes,
    modelFirst,
    choice,
    colourChoices,
    selected,
    unavailable,
    images,
    activeImage,
    setActiveImage,
    pickColour,
    pickSize,
  };
}
