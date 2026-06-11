import fs from "node:fs/promises";
import path from "node:path";

const sourceCsv = path.resolve("../outputs/naver_menus_all.csv");
const dataDir = path.resolve("data");
const restaurantOut = path.join(dataDir, "restaurants_seed.csv");
const menuOut = path.join(dataDir, "menus_seed.csv");
const summaryOut = path.join(dataDir, "prepare_summary.json");

const excludedCategoryKeywords = [
  "카페",
  "디저트",
  "커피",
  "베이커리",
  "베이글",
  "아이스크림",
  "도넛",
  "케이크",
  "차",
  "음료",
  "테이크아웃커피"
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }

  const headers = rows.shift() || [];
  return rows
    .filter((r) => r.some((v) => v.trim()))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] || ""])));
}

function toCsv(rows, headers) {
  const escape = (value) => {
    const text = value == null ? "" : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))].join("\n") + "\n";
}

function isExcludedCategory(category) {
  return excludedCategoryKeywords.some((keyword) => category.includes(keyword));
}

function parsePrice(priceText) {
  const nums = String(priceText || "")
    .replace(/,/g, "")
    .match(/\d{3,}/g)
    ?.map((n) => Number(n))
    .filter(Number.isFinite) || [];
  if (!nums.length) return { price_min: "", price_max: "" };
  return {
    price_min: Math.min(...nums),
    price_max: Math.max(...nums)
  };
}

function stableMenuId(row) {
  return [
    row.place_id,
    row.menu_index || "x",
    row.menu_name || "",
    row.price || ""
  ]
    .join(":")
    .replace(/\s+/g, " ")
    .trim();
}

await fs.mkdir(dataDir, { recursive: true });

const rawRows = parseCsv(await fs.readFile(sourceCsv, "utf8"));
const sourceStoreCount = new Set(rawRows.map((row) => row.place_id)).size;
const rows = rawRows.filter((row) => row.place_id && row.menu_name && !isExcludedCategory(row.category || ""));

const restaurants = new Map();
const menus = [];
const seenMenus = new Set();

for (const row of rows) {
  if (!restaurants.has(row.place_id)) {
    restaurants.set(row.place_id, {
      id: row.place_id,
      source_row: row.source_row,
      store_name: row.store_name,
      naver_place_name: row.naver_place_name || row.store_name,
      category: row.category || "기타",
      address: row.address,
      naver_road_address: row.naver_road_address,
      first_image: row.first_image,
      naver_url: row.source_url
    });
  }

  const key = stableMenuId(row);
  if (seenMenus.has(key)) continue;
  seenMenus.add(key);

  const price = parsePrice(row.price);
  menus.push({
    restaurant_id: row.place_id,
    menu_index: row.menu_index,
    name: row.menu_name,
    price_text: row.price,
    price_min: price.price_min,
    price_max: price.price_max,
    description: row.description,
    recommended: row.recommended === "Y" ? "true" : "false",
    image_url: row.first_image
  });
}

const restaurantRows = [...restaurants.values()].sort((a, b) => {
  const ca = a.category.localeCompare(b.category, "ko");
  return ca || a.naver_place_name.localeCompare(b.naver_place_name, "ko");
});

menus.sort((a, b) => {
  const place = a.restaurant_id.localeCompare(b.restaurant_id);
  return place || Number(a.menu_index || 0) - Number(b.menu_index || 0);
});

await fs.writeFile(
  restaurantOut,
  toCsv(restaurantRows, [
    "id",
    "source_row",
    "store_name",
    "naver_place_name",
    "category",
    "address",
    "naver_road_address",
    "first_image",
    "naver_url"
  ])
);

await fs.writeFile(
  menuOut,
  toCsv(menus, [
    "restaurant_id",
    "menu_index",
    "name",
    "price_text",
    "price_min",
    "price_max",
    "description",
    "recommended",
    "image_url"
  ])
);

const summary = {
  sourceMenuRows: rawRows.length,
  sourceStoreCount,
  filteredMenuRows: menus.length,
  filteredRestaurantCount: restaurantRows.length,
  excludedRestaurantCount: sourceStoreCount - restaurantRows.length,
  excludedCategoryKeywords
};

await fs.writeFile(summaryOut, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
