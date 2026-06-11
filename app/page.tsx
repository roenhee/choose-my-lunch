"use client";

import {
  ChevronDown,
  ChevronUp,
  Heart,
  Loader2,
  MapPin,
  Shuffle,
  Soup,
  Utensils
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getVisitorId } from "@/lib/visitor";
import { isSupabaseConfigured, Menu, Restaurant, supabase } from "@/lib/supabase";

type RestaurantWithMenus = Restaurant & {
  menus: Menu[];
};

type RandomPick = {
  restaurant: RestaurantWithMenus;
  menu: Menu;
};

const priceBands = [
  { label: "전체", min: 0, max: Number.MAX_SAFE_INTEGER },
  { label: "1만원 이하", min: 0, max: 10000 },
  { label: "1만원대", min: 10000, max: 19999 },
  { label: "2만원대", min: 20000, max: 29999 },
  { label: "3만원 이상", min: 30000, max: Number.MAX_SAFE_INTEGER }
];

function formatPrice(menu: Menu) {
  if (menu.price_text) return menu.price_text;
  if (menu.price_min) return `${menu.price_min.toLocaleString("ko-KR")}원`;
  return "가격 미기재";
}

function getMenuLikeMap(likes: Set<string>, restaurant: RestaurantWithMenus) {
  return restaurant.menus.reduce<Record<string, boolean>>((acc, menu) => {
    acc[menu.id] = likes.has(`menu:${menu.id}`);
    return acc;
  }, {});
}

function RestaurantCard({
  restaurant,
  likedRestaurants,
  likedMenus,
  expanded,
  onToggleExpanded,
  onLike
}: {
  restaurant: RestaurantWithMenus;
  likedRestaurants: Set<string>;
  likedMenus: Set<string>;
  expanded: boolean;
  onToggleExpanded: () => void;
  onLike: (targetType: "restaurant" | "menu", targetId: string) => void;
}) {
  const menuLikeMap = getMenuLikeMap(likedMenus, restaurant);
  const visibleMenus = expanded ? restaurant.menus : restaurant.menus.slice(0, 4);

  return (
    <article className="restaurant">
      <div className="restaurant-head">
        <div>
          <div className="restaurant-title">
            <h2>{restaurant.naver_place_name}</h2>
            <span className="badge">{restaurant.category}</span>
          </div>
          <p className="address">
            <MapPin size={14} aria-hidden />
            {" "}
            {restaurant.naver_road_address || restaurant.address || "주소 미기재"}
          </p>
        </div>
        <div className="actions">
          <button
            className={`icon-button ${likedRestaurants.has(`restaurant:${restaurant.id}`) ? "active" : ""}`}
            onClick={() => onLike("restaurant", restaurant.id)}
            title="식당 좋아요"
            type="button"
          >
            <Heart size={16} aria-hidden />
            {restaurant.like_count}
          </button>
          <button className="icon-button" onClick={onToggleExpanded} title="메뉴 펼치기" type="button">
            {expanded ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
            {restaurant.menus.length}
          </button>
        </div>
      </div>

      <div className="menu-grid">
        {visibleMenus.map((menu) => (
          <div className="menu-card" key={menu.id}>
            <strong>{menu.name}</strong>
            <div className="menu-meta">
              <span className="price">{formatPrice(menu)}</span>
              <button
                className={`icon-button ${menuLikeMap[menu.id] ? "active" : ""}`}
                onClick={() => onLike("menu", menu.id)}
                title="메뉴 좋아요"
                type="button"
              >
                <Heart size={14} aria-hidden />
                {menu.like_count ?? 0}
              </button>
            </div>
            {menu.description ? <p className="description">{menu.description}</p> : null}
          </div>
        ))}
      </div>
    </article>
  );
}

export default function Home() {
  const [restaurants, setRestaurants] = useState<RestaurantWithMenus[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("전체");
  const [priceBand, setPriceBand] = useState(priceBands[0].label);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [likedTargets, setLikedTargets] = useState<Set<string>>(new Set());
  const [randomPick, setRandomPick] = useState<RandomPick | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      if (!isSupabaseConfigured) {
        setError("Supabase 환경변수가 아직 설정되지 않았습니다. .env.local 또는 Vercel 환경변수를 확인해주세요.");
        setLoading(false);
        return;
      }

      const [{ data: restaurantData, error: restaurantError }, { data: menuData, error: menuError }, visitorId] =
        await Promise.all([
          supabase.from("restaurant_cards").select("*").order("category").order("naver_place_name"),
          supabase.from("menus").select("*").order("menu_index"),
          Promise.resolve(getVisitorId())
        ]);

      if (restaurantError || menuError) {
        setError(restaurantError?.message || menuError?.message || "데이터를 불러오지 못했습니다.");
        setLoading(false);
        return;
      }

      const restaurantRows = (restaurantData || []) as Restaurant[];
      const menuRows = (menuData || []) as Menu[];

      const { data: likeRows } = await supabase
        .from("likes")
        .select("target_type,target_id,visitor_id")
        .eq("visitor_id", visitorId);

      const { data: menuLikeCounts } = await supabase
        .from("likes")
        .select("target_id")
        .eq("target_type", "menu");

      const menuLikeCountMap = new Map<string, number>();
      for (const row of menuLikeCounts || []) {
        menuLikeCountMap.set(row.target_id, (menuLikeCountMap.get(row.target_id) || 0) + 1);
      }

      const menusByRestaurant = new Map<string, Menu[]>();
      for (const menu of menuRows) {
        const list = menusByRestaurant.get(menu.restaurant_id) || [];
        list.push({ ...menu, like_count: menuLikeCountMap.get(menu.id) || 0 });
        menusByRestaurant.set(menu.restaurant_id, list);
      }

      setRestaurants(
        restaurantRows
          .map((restaurant) => ({
            ...restaurant,
            menus: menusByRestaurant.get(restaurant.id) || []
          }))
          .filter((restaurant) => restaurant.menus.length > 0)
      );
      setCategories(["전체", ...Array.from(new Set(restaurantRows.map((row) => row.category))).sort((a, b) => a.localeCompare(b, "ko"))]);
      setLikedTargets(new Set((likeRows || []).map((row) => `${row.target_type}:${row.target_id}`)));
      setLoading(false);
    }

    load();
  }, []);

  const filteredRestaurants = useMemo(() => {
    const band = priceBands.find((item) => item.label === priceBand) || priceBands[0];
    const text = query.trim().toLowerCase();

    return restaurants
      .map((restaurant) => {
        const menus = restaurant.menus.filter((menu) => {
          const menuPrice = menu.price_min ?? 0;
          const priceMatches = priceBand === "전체" || (menuPrice >= band.min && menuPrice <= band.max);
          const textMatches =
            !text ||
            restaurant.naver_place_name.toLowerCase().includes(text) ||
            restaurant.store_name.toLowerCase().includes(text) ||
            menu.name.toLowerCase().includes(text);
          return priceMatches && textMatches;
        });
        return { ...restaurant, menus };
      })
      .filter((restaurant) => {
        const categoryMatches = category === "전체" || restaurant.category === category;
        return categoryMatches && restaurant.menus.length > 0;
      });
  }, [category, priceBand, query, restaurants]);

  async function handleLike(targetType: "restaurant" | "menu", targetId: string) {
    const visitorId = getVisitorId();
    const key = `${targetType}:${targetId}`;
    if (likedTargets.has(key)) return;

    setLikedTargets((prev) => new Set(prev).add(key));
    if (targetType === "restaurant") {
      setRestaurants((prev) =>
        prev.map((restaurant) =>
          restaurant.id === targetId ? { ...restaurant, like_count: restaurant.like_count + 1 } : restaurant
        )
      );
    } else {
      setRestaurants((prev) =>
        prev.map((restaurant) => ({
          ...restaurant,
          menus: restaurant.menus.map((menu) =>
            menu.id === targetId ? { ...menu, like_count: (menu.like_count || 0) + 1 } : menu
          )
        }))
      );
    }

    const { error: insertError } = await supabase.from("likes").insert({
      target_type: targetType,
      target_id: targetId,
      visitor_id: visitorId
    });

    if (insertError && insertError.code !== "23505") {
      setError(insertError.message);
    }
  }

  function handleRandomPick() {
    const candidates = filteredRestaurants.flatMap((restaurant) =>
      restaurant.menus.map((menu) => ({ restaurant, menu }))
    );

    if (!candidates.length) {
      setRandomPick(null);
      return;
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    setRandomPick(pick);
    setExpanded((prev) => new Set(prev).add(pick.restaurant.id));
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-mark">
              <Soup size={22} aria-hidden />
            </div>
            <div>
              <h1>Choose My Lunch</h1>
              <p>판교 근처 메뉴 데이터로 오늘 점심 고르기</p>
            </div>
          </div>
          <div className="status">
            <span>{restaurants.length.toLocaleString("ko-KR")}곳</span>
            <span>{restaurants.reduce((sum, item) => sum + item.menus.length, 0).toLocaleString("ko-KR")}개 메뉴</span>
          </div>
        </div>
      </header>

      <section className="page">
        <div className="controls">
          <div className="field">
            <label htmlFor="query">검색</label>
            <input
              className="input"
              id="query"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="식당명 또는 메뉴명"
              value={query}
            />
          </div>
          <div className="field">
            <label htmlFor="category">분류</label>
            <select className="select" id="category" onChange={(event) => setCategory(event.target.value)} value={category}>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="price">가격대</label>
            <select className="select" id="price" onChange={(event) => setPriceBand(event.target.value)} value={priceBand}>
              {priceBands.map((item) => (
                <option key={item.label} value={item.label}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <button className="button" onClick={handleRandomPick} type="button">
            <Shuffle size={17} aria-hidden />
            랜덤 선택
          </button>
        </div>

        {error ? <p className="error">{error}</p> : null}

        <div className="content">
          <section className="list">
            {loading ? (
              <div className="empty">
                <Loader2 size={24} aria-hidden />
                데이터를 불러오는 중입니다.
              </div>
            ) : filteredRestaurants.length ? (
              filteredRestaurants.map((restaurant) => (
                <RestaurantCard
                  expanded={expanded.has(restaurant.id)}
                  key={restaurant.id}
                  likedMenus={likedTargets}
                  likedRestaurants={likedTargets}
                  onLike={handleLike}
                  onToggleExpanded={() =>
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(restaurant.id)) next.delete(restaurant.id);
                      else next.add(restaurant.id);
                      return next;
                    })
                  }
                  restaurant={restaurant}
                />
              ))
            ) : (
              <div className="empty">조건에 맞는 메뉴가 없습니다.</div>
            )}
          </section>

          <aside className="panel">
            <div className="random-card">
              <h2>오늘의 추천</h2>
              {randomPick ? (
                <div className="pick">
                  <span className="badge">{randomPick.restaurant.category}</span>
                  <strong>{randomPick.restaurant.naver_place_name}</strong>
                  <span>{randomPick.menu.name}</span>
                  <span className="price">{formatPrice(randomPick.menu)}</span>
                </div>
              ) : (
                <p className="description">조건을 고르고 랜덤 선택을 눌러보세요.</p>
              )}
            </div>

            <div className="summary-card">
              <h2>현재 조건</h2>
              <p className="description">
                {filteredRestaurants.length.toLocaleString("ko-KR")}곳의 식당,
                {" "}
                {filteredRestaurants.reduce((sum, item) => sum + item.menus.length, 0).toLocaleString("ko-KR")}개 메뉴가
                후보입니다.
              </p>
              <button className="button secondary" onClick={() => {
                setCategory("전체");
                setPriceBand("전체");
                setQuery("");
                setRandomPick(null);
              }} type="button">
                <Utensils size={16} aria-hidden />
                조건 초기화
              </button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
