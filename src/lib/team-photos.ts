import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { indexedDbStorage } from "./indexed-db-storage.ts";

/** Photos des membres stockées localement (upload utilisateur). Chaque valeur
 *  est une data-URL PNG redimensionnée (~256 px) — jamais envoyée au réseau.
 *  Persistées en IndexedDB comme le store principal (clé dédiée). */
export type TeamPhotos = Record<string, string>;

const MAX_SIZE = 512;

export interface TeamPhotoState {
  photos: TeamPhotos;
  setPhoto: (memberId: string, dataUrl: string) => void;
  clearPhoto: (memberId: string) => void;
}

export const useTeamPhotoStore = create<TeamPhotoState>()(
  persist(
    (set) => ({
      photos: {},
      setPhoto: (memberId, dataUrl) =>
        set((s) => ({ photos: { ...s.photos, [memberId]: dataUrl } })),
      clearPhoto: (memberId) =>
        set((s) => {
          const photos = { ...s.photos };
          delete photos[memberId];
          return { photos };
        }),
    }),
    {
      name: "ovitech-team-photos-v1",
      storage: createJSONStorage(() => indexedDbStorage()),
      partialize: (s) => ({ photos: s.photos }),
    },
  ),
);

/** Lit un fichier image, le redimensionne en carré/bordures serrées et renvoie
 *  une data-URL PNG. Rejette si ce n'est pas une image décodable. */
export function resizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_SIZE / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas 2d indisponible");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("fichier image illisible"));
    };
    img.src = url;
  });
}