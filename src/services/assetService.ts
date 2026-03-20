const assetLibrary = {
  perfume: "perfume_bottle.glb",
  shoe: "shoe.glb",
  phone: "smartphone.glb",
  chair: "chair.glb"
};

export function getAssetForObject(name: string): string | null {
  const key = name.toLowerCase();

  for (const asset in assetLibrary) {
    if (key.includes(asset)) {
      return assetLibrary[asset as keyof typeof assetLibrary];
    }
  }

  return null;
}