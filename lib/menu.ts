import { httpsUrl, money, text } from "./http";

export function productFields(body: Record<string, unknown>) {
  const name = text(body.name, 90), description = text(body.description, 400), category = text(body.category, 60);
  const price = money(body.price);
  const photo = body.photo_url ? httpsUrl(body.photo_url) : null;
  if (name.length < 2) return { error: "Informe o nome do produto" };
  if (price === null) return { error: "Preço inválido" };
  if (body.photo_url && !photo) return { error: "A foto precisa ser um link https://" };
  return { name, description: description || null, category: category || null, price, photo, available: body.available !== false };
}
