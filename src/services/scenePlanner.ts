const INVALID_OBJECTS = [
  "light",
  "lighting",
  "glow",
  "particles",
  "smoke",
  "sparkles",
  "shadow"
];

function filterObjects(objects: string[]) {
  return objects.filter((obj) => !INVALID_OBJECTS.includes(obj.toLowerCase()));
}

export function createScenePlan(prompt: string, context: any) {
  const words = prompt.toLowerCase().split(" ");

  const objects = words.filter(word =>
    !["create", "make", "3d", "scene", "a", "an", "the"].includes(word)
  );
  const cleanedObjects = filterObjects(objects);

  return {
    objects: cleanedObjects.length > 0 ? cleanedObjects : ["product"],
    style: context.style || "default",
    use_case: context.use_case || "general",
    animation: context.animation || "none"
  };  
}
