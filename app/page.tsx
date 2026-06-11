"use client";

import {
  ChevronDown,
  ChevronUp,
  Building2,
  FilePlus2,
  ExternalLink,
  Heart,
  Loader2,
  MapPin,
  MessageSquarePlus,
  PencilLine,
  Shuffle,
  Soup,
  X,
  Utensils
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { getVisitorId } from "@/lib/visitor";
import { isSupabaseConfigured, Menu, Restaurant, supabase } from "@/lib/supabase";

type RestaurantWithMenus = Restaurant & {
  menus: Menu[];
};

type RandomPick = {
  restaurant: RestaurantWithMenus;
  menu: Menu;
};

type RequestMode = "restaurant-add" | "menu-add" | "menu-existing";
type RequestAction = "add" | "update" | "delete";

type RequestDraft = {
  mode: RequestMode;
  restaurantId: string | null;
  menuId: string | null;
  restaurantName: string;
  category: string;
  address: string;
  naverUrl: string;
  menuName: string;
  priceText: string;
  description: string;
  details: string;
  action: RequestAction;
};

const priceBands = [
  { label: "전체", min: 0, max: Number.MAX_SAFE_INTEGER },
  { label: "8천원 이하", min: 0, max: 8000 },
  { label: "만2천원 이하", min: 0, max: 12000 },
  { label: "만오천원 이하", min: 0, max: 15000 },
  { label: "만 팔천원 이하", min: 0, max: 18000 },
  { label: "2만원 이상", min: 20000, max: Number.MAX_SAFE_INTEGER }
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

function createRequestDraft(mode: RequestMode, restaurant?: RestaurantWithMenus, menu?: Menu): RequestDraft {
  if (mode === "restaurant-add") {
    return {
      mode,
      restaurantId: null,
      menuId: null,
      restaurantName: "",
      category: "",
      address: "",
      naverUrl: "",
      menuName: "",
      priceText: "",
      description: "",
      details: "",
      action: "add"
    };
  }

  if (mode === "menu-add") {
    return {
      mode,
      restaurantId: restaurant?.id || null,
      menuId: null,
      restaurantName: restaurant?.naver_place_name || "",
      category: restaurant?.category || "",
      address: restaurant?.naver_road_address || restaurant?.address || "",
      naverUrl: restaurant?.naver_url || "",
      menuName: "",
      priceText: "",
      description: "",
      details: "",
      action: "add"
    };
  }

  return {
    mode,
    restaurantId: restaurant?.id || null,
    menuId: menu?.id || null,
    restaurantName: restaurant?.naver_place_name || "",
    category: restaurant?.category || "",
    address: restaurant?.naver_road_address || restaurant?.address || "",
    naverUrl: restaurant?.naver_url || "",
    menuName: menu?.name || "",
    priceText: menu?.price_text || "",
    description: menu?.description || "",
    details: "",
    action: "update"
  };
}

function RestaurantCard({
  restaurant,
  likedRestaurants,
  likedMenus,
  expanded,
  onToggleExpanded,
  onLike,
  onRequestMenuAdd,
  onRequestMenuEdit
}: {
  restaurant: RestaurantWithMenus;
  likedRestaurants: Set<string>;
  likedMenus: Set<string>;
  expanded: boolean;
  onToggleExpanded: () => void;
  onLike: (targetType: "restaurant" | "menu", targetId: string) => void;
  onRequestMenuAdd: (restaurant: RestaurantWithMenus) => void;
  onRequestMenuEdit: (restaurant: RestaurantWithMenus, menu: Menu) => void;
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
          {restaurant.naver_url ? (
            <a className="map-link" href={restaurant.naver_url} target="_blank" rel="noreferrer">
              <ExternalLink size={13} aria-hidden />
              네이버 지도
            </a>
          ) : null}
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
          <button className="icon-button secondary" onClick={() => onRequestMenuAdd(restaurant)} title="메뉴 추가 요청" type="button">
            <FilePlus2 size={16} aria-hidden />
            메뉴 추가
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
            <button className="menu-request" onClick={() => onRequestMenuEdit(restaurant, menu)} type="button">
              <PencilLine size={14} aria-hidden />
              수정/삭제 요청
            </button>
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
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestDraft, setRequestDraft] = useState<RequestDraft>(() => createRequestDraft("restaurant-add"));
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestNotice, setRequestNotice] = useState("");
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

      const { data: restaurantLikeCounts } = await supabase
        .from("likes")
        .select("target_id")
        .eq("target_type", "restaurant");

      const menuLikeCountMap = new Map<string, number>();
      for (const row of menuLikeCounts || []) {
        menuLikeCountMap.set(row.target_id, (menuLikeCountMap.get(row.target_id) || 0) + 1);
      }

      const restaurantLikeCountMap = new Map<string, number>();
      for (const row of restaurantLikeCounts || []) {
        restaurantLikeCountMap.set(row.target_id, (restaurantLikeCountMap.get(row.target_id) || 0) + 1);
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
            like_count: restaurantLikeCountMap.get(restaurant.id) || restaurant.like_count || 0,
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

  const orderedRestaurants = useMemo(() => {
    if (!randomPick) return filteredRestaurants;

    return [...filteredRestaurants].sort((left, right) => {
      if (left.id === randomPick.restaurant.id) return -1;
      if (right.id === randomPick.restaurant.id) return 1;
      return 0;
    }).map((restaurant) => {
      if (restaurant.id !== randomPick.restaurant.id) return restaurant;
      const menus = [...restaurant.menus].sort((left, right) => {
        if (left.id === randomPick.menu.id) return -1;
        if (right.id === randomPick.menu.id) return 1;
        return Number(left.menu_index || 0) - Number(right.menu_index || 0);
      });
      return { ...restaurant, menus };
    });
  }, [filteredRestaurants, randomPick]);

  const filteredMenuCount = orderedRestaurants.reduce((sum, item) => sum + item.menus.length, 0);
  const filteredRestaurantCount = orderedRestaurants.length;

  function openRestaurantRequest() {
    setRequestDraft(createRequestDraft("restaurant-add"));
    setRequestNotice("");
    setRequestOpen(true);
  }

  function openMenuAddRequest(restaurant: RestaurantWithMenus) {
    setRequestDraft(createRequestDraft("menu-add", restaurant));
    setRequestNotice("");
    setRequestOpen(true);
  }

  function openMenuEditRequest(restaurant: RestaurantWithMenus, menu: Menu) {
    setRequestDraft(createRequestDraft("menu-existing", restaurant, menu));
    setRequestNotice("");
    setRequestOpen(true);
  }

  async function handleLike(targetType: "restaurant" | "menu", targetId: string) {
    const visitorId = getVisitorId();
    const key = `${targetType}:${targetId}`;
    const wasLiked = likedTargets.has(key);
    const nextLiked = !wasLiked;

    setLikedTargets((prev) => {
      const next = new Set(prev);
      if (nextLiked) next.add(key);
      else next.delete(key);
      return next;
    });
    setRestaurants((prev) =>
      prev.map((restaurant) => {
        if (targetType === "restaurant" && restaurant.id === targetId) {
          return { ...restaurant, like_count: Math.max(0, (restaurant.like_count || 0) + (nextLiked ? 1 : -1)) };
        }
        if (targetType === "menu") {
          return {
            ...restaurant,
            menus: restaurant.menus.map((menu) =>
              menu.id === targetId
                ? { ...menu, like_count: Math.max(0, (menu.like_count || 0) + (nextLiked ? 1 : -1)) }
                : menu
            )
          };
        }
        return restaurant;
      })
    );

    const { error: likeError } = await supabase.rpc("toggle_like", {
      p_target_type: targetType,
      p_target_id: targetId,
      p_visitor_id: visitorId
    });

    if (likeError) {
      setError(likeError.message);
      setLikedTargets((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(key);
        else next.delete(key);
        return next;
      });
      setRestaurants((prev) =>
        prev.map((restaurant) => {
          if (targetType === "restaurant" && restaurant.id === targetId) {
            return { ...restaurant, like_count: Math.max(0, (restaurant.like_count || 0) + (wasLiked ? 1 : -1)) };
          }
          if (targetType === "menu") {
            return {
              ...restaurant,
              menus: restaurant.menus.map((menu) =>
                menu.id === targetId
                  ? { ...menu, like_count: Math.max(0, (menu.like_count || 0) + (wasLiked ? 1 : -1)) }
                  : menu
              )
            };
          }
          return restaurant;
        })
      );
    }
  }

  async function handleSubmitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      setError("Supabase 환경변수가 아직 설정되지 않았습니다. .env.local 또는 Vercel 환경변수를 확인해주세요.");
      return;
    }

    const visitorId = getVisitorId();
    const title = requestDraft.mode === "restaurant-add" ? requestDraft.restaurantName.trim() : requestDraft.menuName.trim();
    if (!title) {
      setRequestNotice("제목을 입력해 주세요.");
      return;
    }

    setRequestBusy(true);
    setRequestNotice("");

    const actionType = requestDraft.action;
    const payload = {
      restaurant_name: requestDraft.restaurantName.trim(),
      category: requestDraft.category.trim(),
      address: requestDraft.address.trim(),
      naver_url: requestDraft.naverUrl.trim(),
      menu_name: requestDraft.menuName.trim(),
      price_text: requestDraft.priceText.trim(),
      description: requestDraft.description.trim(),
      details: requestDraft.details.trim()
    };

    const { error: requestError } = await supabase.from("content_requests").insert({
      entity_type: requestDraft.mode === "restaurant-add" ? "restaurant" : "menu",
      action_type: actionType,
      restaurant_id: requestDraft.restaurantId,
      menu_id: requestDraft.menuId,
      title,
      details: requestDraft.details.trim(),
      payload,
      visitor_id: visitorId
    });

    setRequestBusy(false);

    if (requestError) {
      setRequestNotice(requestError.message);
      return;
    }

    setRequestOpen(false);
    setRequestNotice("요청이 접수됐어요. 확인 후 반영할 수 있습니다.");
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

  function handleResetFilters() {
    setCategory("전체");
    setPriceBand("전체");
    setQuery("");
    setRandomPick(null);
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
          <button className="button secondary" onClick={openRestaurantRequest} type="button">
            <Building2 size={16} aria-hidden />
            음식점 추가 요청
          </button>
          <button className="button" onClick={handleRandomPick} type="button">
            <Shuffle size={17} aria-hidden />
            랜덤 선택
          </button>
        </div>

        {error ? <p className="error">{error}</p> : null}
        {requestNotice ? <p className="notice">{requestNotice}</p> : null}

        <div className="content">
          <section className="list content-list">
            {loading ? (
              <div className="empty">
                <Loader2 size={24} aria-hidden />
                데이터를 불러오는 중입니다.
              </div>
            ) : orderedRestaurants.length ? (
              orderedRestaurants.map((restaurant) => (
                <RestaurantCard
                  expanded={expanded.has(restaurant.id)}
                  key={restaurant.id}
                  likedMenus={likedTargets}
                  likedRestaurants={likedTargets}
                  onLike={handleLike}
                  onRequestMenuAdd={openMenuAddRequest}
                  onRequestMenuEdit={openMenuEditRequest}
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

          <aside className="panel content-panel">
            <div className="merged-card">
              <div className="merged-head">
                <div>
                  <h2>오늘의 추천</h2>
                  <p className="description">
                    현재 조건 결과: {filteredRestaurantCount.toLocaleString("ko-KR")}곳의 식당,
                    {" "}
                    {filteredMenuCount.toLocaleString("ko-KR")}개 메뉴가 후보예요.
                  </p>
                </div>
                <button className="button secondary" onClick={handleResetFilters} type="button">
                  조건 초기화
                </button>
              </div>

              {randomPick ? (
                <div className="pick">
                  <span className="badge">{randomPick.restaurant.category}</span>
                  <strong>{randomPick.restaurant.naver_place_name}</strong>
                  <span>{randomPick.menu.name}</span>
                  <span className="price">{formatPrice(randomPick.menu)}</span>
                  {randomPick.menu.description ? <p className="description">{randomPick.menu.description}</p> : null}
                </div>
              ) : (
                <p className="description">조건을 고르고 랜덤 선택을 눌러보세요.</p>
              )}
            </div>
          </aside>
        </div>
      </section>

      {requestOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setRequestOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3>{requestDraft.mode === "restaurant-add" ? "음식점 추가 요청" : requestDraft.mode === "menu-add" ? "메뉴 추가 요청" : "메뉴 수정/삭제 요청"}</h3>
                <p>
                  {requestDraft.mode === "restaurant-add"
                    ? "새 음식점을 제안해 주세요."
                    : requestDraft.mode === "menu-add"
                      ? "해당 음식점에 새로운 메뉴를 제안해 주세요."
                      : "기존 메뉴의 수정이나 삭제 요청을 남겨 주세요."}
                </p>
              </div>
              <button className="icon-button" onClick={() => setRequestOpen(false)} type="button" title="닫기">
                <X size={16} aria-hidden />
              </button>
            </div>

            <form className="request-form" onSubmit={handleSubmitRequest}>
              {requestDraft.mode === "restaurant-add" ? (
                <>
                  <div className="field">
                    <label htmlFor="restaurant-name">음식점 이름</label>
                    <input
                      className="input"
                      id="restaurant-name"
                      onChange={(event) => setRequestDraft((prev) => ({ ...prev, restaurantName: event.target.value }))}
                      value={requestDraft.restaurantName}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="restaurant-category">분류</label>
                    <input
                      className="input"
                      id="restaurant-category"
                      onChange={(event) => setRequestDraft((prev) => ({ ...prev, category: event.target.value }))}
                      placeholder="예: 한식"
                      value={requestDraft.category}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="restaurant-address">주소</label>
                    <input
                      className="input"
                      id="restaurant-address"
                      onChange={(event) => setRequestDraft((prev) => ({ ...prev, address: event.target.value }))}
                      value={requestDraft.address}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="restaurant-url">네이버 지도 URL</label>
                    <input
                      className="input"
                      id="restaurant-url"
                      onChange={(event) => setRequestDraft((prev) => ({ ...prev, naverUrl: event.target.value }))}
                      value={requestDraft.naverUrl}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="request-context">
                    <span className="badge">{requestDraft.category || "분류 없음"}</span>
                    <strong>{requestDraft.restaurantName}</strong>
                    <p>{requestDraft.address || "주소 미기재"}</p>
                  </div>
                  {requestDraft.mode === "menu-add" ? <p className="request-kind">요청 종류: 추가 요청</p> : null}
                  {requestDraft.mode === "menu-existing" ? (
                    <div className="field">
                      <label htmlFor="request-action">요청 종류</label>
                      <select
                        className="select"
                        id="request-action"
                        onChange={(event) =>
                          setRequestDraft((prev) => ({ ...prev, action: event.target.value as RequestAction }))
                        }
                        value={requestDraft.action}
                      >
                        <option value="update">수정 요청</option>
                        <option value="delete">삭제 요청</option>
                      </select>
                    </div>
                  ) : null}
                  {requestDraft.mode === "menu-existing" ? (
                    <div className="field">
                      <label htmlFor="menu-name">메뉴명</label>
                      <input
                        className="input"
                        id="menu-name"
                        onChange={(event) => setRequestDraft((prev) => ({ ...prev, menuName: event.target.value }))}
                        value={requestDraft.menuName}
                      />
                    </div>
                  ) : (
                    <div className="field">
                      <label htmlFor="menu-name">메뉴명</label>
                      <input
                        className="input"
                        id="menu-name"
                        onChange={(event) => setRequestDraft((prev) => ({ ...prev, menuName: event.target.value }))}
                        placeholder="새 메뉴 이름을 적어주세요"
                        value={requestDraft.menuName}
                      />
                    </div>
                  )}
                  <div className="field">
                    <label htmlFor="menu-price">가격</label>
                    <input
                      className="input"
                      id="menu-price"
                      onChange={(event) => setRequestDraft((prev) => ({ ...prev, priceText: event.target.value }))}
                      placeholder="예: 12,000원"
                      value={requestDraft.priceText}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="menu-description">설명</label>
                    <textarea
                      className="textarea"
                      id="menu-description"
                      onChange={(event) => setRequestDraft((prev) => ({ ...prev, description: event.target.value }))}
                      rows={3}
                      value={requestDraft.description}
                    />
                  </div>
                </>
              )}

              <div className="field">
                <label htmlFor="request-details">추가 요청 내용</label>
                <textarea
                  className="textarea"
                  id="request-details"
                  onChange={(event) => setRequestDraft((prev) => ({ ...prev, details: event.target.value }))}
                  placeholder="어떤 점을 어떻게 바꾸면 좋을지 적어주세요."
                  rows={4}
                  value={requestDraft.details}
                />
              </div>

              <div className="modal-actions">
                <button className="button secondary" onClick={() => setRequestOpen(false)} type="button">
                  닫기
                </button>
                <button className="button" disabled={requestBusy} type="submit">
                  <MessageSquarePlus size={16} aria-hidden />
                  {requestBusy ? "전송 중" : "요청 보내기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
