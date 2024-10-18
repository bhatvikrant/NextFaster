import { db } from "@/db";
import {
  categories,
  products,
  subcategories,
  subcollection,
} from "@/db/schema";
import { count, eq } from "drizzle-orm";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: categoryParam } = await params;
  const urlDecoded = decodeURIComponent(categoryParam);
  const category = await db.query.categories.findFirst({
    where: (categories, { eq }) => eq(categories.slug, urlDecoded),
    with: {
      subcollections: true,
    },
    orderBy: (categories, { asc }) => asc(categories.name),
  });

  if (!category) {
    return notFound();
  }

  const examples = category.subcollections
    .slice(0, 2)
    .map((s) => s.name)
    .join(", ");

  return {
    title: `${category.name} | NextMaster`,
    openGraph: {
      title: `${category.name} | NextMaster`,
      description: `Choose from our selection of ${category.name}, including ${examples + (category.subcollections.length > 1 ? "," : "")} and more. In stock and ready to ship.`,
    },
  };
}

export default async function Page(props: {
  params: Promise<{
    category: string;
  }>;
}) {
  const { category } = await props.params;
  const urlDecoded = decodeURIComponent(category);
  const cat = await db.query.categories.findFirst({
    where: (categories, { eq }) => eq(categories.slug, urlDecoded),
    with: {
      subcollections: {
        with: {
          subcategories: true,
        },
      },
    },
    orderBy: (categories, { asc }) => asc(categories.name),
  });
  if (!cat) {
    return notFound();
  }

  const countRes = await db
    .select({ count: count() })
    .from(categories)
    .leftJoin(subcollection, eq(categories.slug, subcollection.category_slug))
    .leftJoin(
      subcategories,
      eq(subcollection.id, subcategories.subcollection_id),
    )
    .leftJoin(products, eq(subcategories.slug, products.subcategory_slug))
    .where(eq(categories.slug, cat.slug));

  const finalCount = countRes[0]?.count;

  return (
    <div className="container mx-auto p-4">
      {finalCount && (
        <h1 className="mb-2 border-b-2 text-sm font-bold">
          {finalCount} Products
        </h1>
      )}
      <div className="space-y-4">
        {cat.subcollections.map((subcollection, index) => (
          <div key={index}>
            <h2 className="mb-2 border-b-2 text-lg font-semibold">
              {subcollection.name}
            </h2>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
              {subcollection.subcategories.map(
                (subcategory, subcategoryIndex) => (
                  <Link
                    key={subcategoryIndex}
                    className="group flex h-full flex-row border px-4 py-2 hover:bg-gray-100"
                    href={`/products/${category}/${subcategory.slug}`}
                  >
                    <div className="py-2">
                      <Image
                        src={subcategory.image_url ?? "/placeholder.svg"}
                        alt={`A small picture of ${subcategory.name}`}
                        width={48}
                        height={48}
                        className="h-12 w-12 flex-shrink-0 object-cover"
                      />
                    </div>
                    <div className="flex h-24 flex-grow flex-col items-start py-2">
                      <div className="text-sm font-medium text-gray-700 group-hover:underline">
                        {subcategory.name}
                      </div>
                    </div>
                  </Link>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
