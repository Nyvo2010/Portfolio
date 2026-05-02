export const getItemClass = (totalAmount: number, index: number) => {
  const layouts: Record<number, string[]> = {
    1: ["col-span-12 aspect-[21/9]"],
    2: ["col-span-6 aspect-square", "col-span-6 aspect-square"],
    3: ["col-span-4 aspect-square", "col-span-4 aspect-square", "col-span-4 aspect-square"],
    4: ["col-span-6 aspect-video", "col-span-6 aspect-video", "col-span-6 aspect-video", "col-span-6 aspect-video"],
    5: ["col-span-6 aspect-[3/2]", "col-span-6 aspect-[3/2]", "col-span-4 aspect-square", "col-span-4 aspect-square", "col-span-4 aspect-square"],
    6: ["col-span-4 aspect-square", "col-span-4 aspect-square", "col-span-4 aspect-square", "col-span-4 aspect-square", "col-span-4 aspect-square", "col-span-4 aspect-square"]
  };

  const count = Math.min(totalAmount, 6);
  const layout = layouts[count] || layouts[6];
  return layout[index % layout.length] || "col-span-4 aspect-square";
};