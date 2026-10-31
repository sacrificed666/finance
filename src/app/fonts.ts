import { Montserrat } from "next/font/google";

// Montserrat, self-hosted at build time; Cyrillic is preloaded too, for Ukrainian
export const montserrat = Montserrat({
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
  variable: "--font-montserrat",
});
