import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-12 text-center">
      <h1 className="text-xl font-semibold">We could not find that.</h1>
      <p className="mt-2 text-sm text-gray-500">
        The product may have been taken off the shelf.
      </p>
      <Link href="/" className="mt-4 inline-block text-sm underline">
        Back to the shop
      </Link>
    </div>
  );
}
