import { PrismaClient, Role, Unit } from "@prisma/client";
import { hash } from "bcryptjs";

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
  /** A path under apps/web/public, not a URL to somebody else's server. */
  imageUrl: string;
  name: string;
  brand?: string;
  category: string;
  description?: string;
  variants: SeedVariant[];
};

// Quantities are in the smallest sensible unit — grams, millilitres, pieces —
// so price-per-unit needs no conversion. See the module 11 lesson.
//
// Image paths point at files in apps/web/public/product-images/, committed to
// this repository. Nothing here hotlinks an image from somebody else's server:
// a link rots, rate-limits, or quietly starts serving something else, and a
// storefront whose pictures vanish looks broken in a way nobody can debug.
//
// The folder is product-images and not products on purpose. Files in public/
// are served from the root, so public/products/tomato.svg would sit inside the
// /products/[slug] route's own namespace and win any collision with it.
const PRODUCTS: SeedProduct[] = [
  {
    slug: "aashirvaad-select-atta",
    imageUrl: "/product-images/aashirvaad-select-atta.svg",
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
    imageUrl: "/product-images/tata-salt.svg",
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
    imageUrl: "/product-images/toor-dal.svg",
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
    imageUrl: "/product-images/tomato.svg",
    name: "Tomato",
    category: "vegetables",
    variants: [
      { sku: "VEG-TOM-500", label: "500 g", unit: Unit.GRAM, quantity: 500, pricePaise: 2500, stock: 40 },
      { sku: "VEG-TOM-1000", label: "1 kg", unit: Unit.GRAM, quantity: 1000, pricePaise: 4800, stock: 25 },
    ],
  },
  {
    slug: "onion",
    imageUrl: "/product-images/onion.svg",
    name: "Onion",
    category: "vegetables",
    variants: [
      { sku: "VEG-ONI-1000", label: "1 kg", unit: Unit.GRAM, quantity: 1000, pricePaise: 3200, stock: 50 },
    ],
  },
  {
    slug: "amul-taaza-toned-milk",
    imageUrl: "/product-images/amul-taaza-toned-milk.svg",
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
    imageUrl: "/product-images/eggs.svg",
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
    imageUrl: "/product-images/parle-g.svg",
    name: "Parle-G Original Glucose Biscuits",
    brand: "Parle",
    category: "snacks",
    variants: [
      { sku: "PARLE-G-250", label: "250 g", unit: Unit.GRAM, quantity: 250, pricePaise: 2500, stock: 60 },
    ],
  },
  {
    slug: "surf-excel-easy-wash",
    imageUrl: "/product-images/surf-excel-easy-wash.svg",
    name: "Surf Excel Easy Wash Detergent Powder",
    brand: "Surf Excel",
    category: "household",
    variants: [
      { sku: "SURF-1000", label: "1 kg", unit: Unit.GRAM, quantity: 1000, pricePaise: 12500, mrpPaise: 14000, stock: 14 },
    ],
  },
];

const SLOTS = [
  { label: "7am – 10am", startHour: 7, endHour: 10, capacity: 12, sortOrder: 1 },
  { label: "10am – 1pm", startHour: 10, endHour: 13, capacity: 16, sortOrder: 2 },
  { label: "4pm – 7pm", startHour: 16, endHour: 19, capacity: 16, sortOrder: 3 },
  // Deliberately tiny: the "slot full" path is reachable in development after
  // two orders rather than sixteen.
  { label: "7pm – 9pm", startHour: 19, endHour: 21, capacity: 2, sortOrder: 4 },
];

// Development logins. Never real passwords, and never seeded outside
// development — the guard on that is in main() below.
const DEMO_CUSTOMER = {
  name: "Asha Kulkarni",
  email: "asha@example.com",
  phone: "9876543210",
  password: "kirana-dev-password",
};

// The shopkeeper. A separate account, not a flag on the customer: the person
// who runs the shop also buys from it, and one account doing both makes every
// "is this allowed?" question ambiguous.
const DEMO_ADMIN = {
  name: "Mahesh Joshi",
  email: "shop@example.com",
  phone: "9812345678",
  password: "kirana-dev-admin",
};

async function main() {
  console.log("Seeding…");

  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed: this deletes data and NODE_ENV is production.");
  }

  // Order matters: children before parents, or a foreign key refuses the
  // delete. Orders are cleared first because they reference everything.
  await prisma.payment.deleteMany();
  await prisma.orderEvent.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.slotBooking.deleteMany();
  await prisma.deliverySlot.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.address.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
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

  for (const slot of SLOTS) {
    await prisma.deliverySlot.create({ data: slot });
  }

  await prisma.user.create({
    data: {
      name: DEMO_CUSTOMER.name,
      email: DEMO_CUSTOMER.email,
      phone: DEMO_CUSTOMER.phone,
      // Cost 12, the same as the application uses. Seeding with a cheaper hash
      // would make the demo login behave differently from a real one.
      passwordHash: await hash(DEMO_CUSTOMER.password, 12),
      role: Role.CUSTOMER,
      addresses: {
        create: {
          label: "Home",
          line1: "Flat 402, Sai Residency, Lane 5",
          landmark: "Opposite the Ganesh temple",
          city: "Pune",
          pincode: "412207",
          isDefault: true,
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      name: DEMO_ADMIN.name,
      email: DEMO_ADMIN.email,
      phone: DEMO_ADMIN.phone,
      passwordHash: await hash(DEMO_ADMIN.password, 12),
      role: Role.ADMIN,
    },
  });

  console.log({
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    variants: await prisma.variant.count(),
    slots: await prisma.deliverySlot.count(),
  });
  console.log(
    `Customer: ${DEMO_CUSTOMER.email} / "${DEMO_CUSTOMER.password}"\n` +
      `Shop admin: ${DEMO_ADMIN.email} / "${DEMO_ADMIN.password}"`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
