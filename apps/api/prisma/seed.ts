import { PrismaClient, Unit } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: "staples", name: "Staples & Grains", sortOrder: 1 },
  { slug: "vegetables", name: "Fresh Vegetables", sortOrder: 2 },
  { slug: "dairy", name: "Dairy & Eggs", sortOrder: 3 },
  { slug: "snacks", name: "Snacks & Beverages", sortOrder: 4 },
  { slug: "household", name: "Household", sortOrder: 5 },
];

type SeedVariant = {
  sku: string;
  label: string;
  unit: Unit;
  quantity: number;
  pricePaise: number;
  mrpPaise?: number;
  stock: number;
};

type SeedProduct = {
  slug: string;
  name: string;
  brand?: string;
  category: string;
  description?: string;
  variants: SeedVariant[];
};

// Quantities are in the smallest sensible unit — grams, millilitres, pieces —
// so price-per-unit needs no conversion. See the module 11 lesson.
const PRODUCTS: SeedProduct[] = [
  {
    slug: "aashirvaad-select-atta",
    name: "Aashirvaad Select Sharbati Atta",
    brand: "Aashirvaad",
    category: "staples",
    description:
      "Stone-ground whole wheat flour made from Sharbati wheat. Soft rotis that stay soft.",
    variants: [
      { sku: "AAS-ATTA-5", label: "5 kg", unit: Unit.GRAM, quantity: 5000, pricePaise: 28500, mrpPaise: 31000, stock: 12 },
      { sku: "AAS-ATTA-10", label: "10 kg", unit: Unit.GRAM, quantity: 10000, pricePaise: 56000, mrpPaise: 62000, stock: 4 },
    ],
  },
  {
    slug: "tata-salt",
    name: "Tata Salt Iodised",
    brand: "Tata",
    category: "staples",
    // Deliberately out of stock: the empty state is exercised on every load.
    variants: [
      { sku: "TATA-SALT-1", label: "1 kg", unit: Unit.GRAM, quantity: 1000, pricePaise: 2800, stock: 0 },
    ],
  },
  {
    slug: "toor-dal",
    name: "Toor Dal (Arhar)",
    category: "staples",
    description: "Unpolished toor dal. Cooks soft in about 20 minutes.",
    variants: [
      { sku: "DAL-TOOR-500", label: "500 g", unit: Unit.GRAM, quantity: 500, pricePaise: 9500, stock: 30 },
      { sku: "DAL-TOOR-1000", label: "1 kg", unit: Unit.GRAM, quantity: 1000, pricePaise: 18000, stock: 18 },
    ],
  },
  {
    slug: "tomato",
    name: "Tomato",
    category: "vegetables",
    variants: [
      { sku: "VEG-TOM-500", label: "500 g", unit: Unit.GRAM, quantity: 500, pricePaise: 2500, stock: 40 },
      { sku: "VEG-TOM-1000", label: "1 kg", unit: Unit.GRAM, quantity: 1000, pricePaise: 4800, stock: 25 },
    ],
  },
  {
    slug: "onion",
    name: "Onion",
    category: "vegetables",
    variants: [
      { sku: "VEG-ONI-1000", label: "1 kg", unit: Unit.GRAM, quantity: 1000, pricePaise: 3200, stock: 50 },
    ],
  },
  {
    slug: "amul-taaza-toned-milk",
    // Long on purpose: the grid must survive it.
    name: "Amul Taaza Homogenised Toned Milk Tetra Pak Long Life",
    brand: "Amul",
    category: "dairy",
    variants: [
      { sku: "AMUL-MILK-1L", label: "1 L", unit: Unit.MILLILITRE, quantity: 1000, pricePaise: 7500, stock: 30 },
    ],
  },
  {
    slug: "eggs",
    name: "Farm Fresh Eggs",
    category: "dairy",
    variants: [
      { sku: "EGG-6", label: "6 pieces", unit: Unit.PIECE, quantity: 6, pricePaise: 4200, stock: 20 },
      { sku: "EGG-12", label: "12 pieces", unit: Unit.PIECE, quantity: 12, pricePaise: 8000, stock: 15 },
      { sku: "EGG-30", label: "30 pieces", unit: Unit.PIECE, quantity: 30, pricePaise: 19000, mrpPaise: 21000, stock: 6 },
    ],
  },
  {
    slug: "parle-g",
    name: "Parle-G Original Glucose Biscuits",
    brand: "Parle",
    category: "snacks",
    variants: [
      { sku: "PARLE-G-250", label: "250 g", unit: Unit.GRAM, quantity: 250, pricePaise: 2500, stock: 60 },
    ],
  },
  {
    slug: "surf-excel-easy-wash",
    name: "Surf Excel Easy Wash Detergent Powder",
    brand: "Surf Excel",
    category: "household",
    variants: [
      { sku: "SURF-1000", label: "1 kg", unit: Unit.GRAM, quantity: 1000, pricePaise: 12500, mrpPaise: 14000, stock: 14 },
    ],
  },
];

async function main() {
  console.log("Seeding…");

  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  for (const category of CATEGORIES) {
    await prisma.category.create({ data: category });
  }

  for (const { category, variants, ...product } of PRODUCTS) {
    await prisma.product.create({
      data: {
        ...product,
        category: { connect: { slug: category } },
        variants: {
          create: variants.map((v) => ({
            ...v,
            // Never store an MRP equal to the price, or the interface shows
            // "₹285, was ₹285".
            mrpPaise: v.mrpPaise && v.mrpPaise > v.pricePaise ? v.mrpPaise : null,
          })),
        },
      },
    });
  }

  console.log({
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    variants: await prisma.variant.count(),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
