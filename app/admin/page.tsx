"use client";

import { Building2, Check, Loader2, LogOut, Shield, X } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";

type AdminRequestRow = {
  id: string;
  entity_type: "restaurant" | "menu";
  action_type: "add" | "update" | "delete";
  restaurant_id: string | null;
  menu_id: string | null;
  title: string;
  details: string;
  payload: Record<string, unknown>;
  created_at: string;
};

type SessionState = "loading" | "signed-out" | "signed-in";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function AdminPage() {
  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [requests, setRequests] = useState<AdminRequestRow[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadSession() {
    const response = await fetch("/api/admin/session", { credentials: "include" });
    const data = (await response.json()) as { authenticated?: boolean };
    setSessionState(data.authenticated ? "signed-in" : "signed-out");
  }

  async function loadRequests() {
    setLoadingRequests(true);
    setError("");
    const response = await fetch("/api/admin/requests", { credentials: "include" });
    const data = (await response.json()) as { requests?: AdminRequestRow[]; message?: string };

    if (!response.ok) {
      setError(data.message || "요청 목록을 불러오지 못했습니다.");
      setRequests([]);
      setLoadingRequests(false);
      return;
    }

    setRequests(data.requests || []);
    setLoadingRequests(false);
  }

  useEffect(() => {
    loadSession().catch(() => setSessionState("signed-out"));
  }, []);

  useEffect(() => {
    if (sessionState === "signed-in") {
      loadRequests().catch(() => setError("요청 목록을 불러오지 못했습니다."));
    }
  }, [sessionState]);

  const requestCountLabel = useMemo(() => `${requests.length.toLocaleString("ko-KR")}건`, [requests.length]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password })
    });

    const data = (await response.json()) as { authenticated?: boolean; message?: string };
    if (!response.ok || !data.authenticated) {
      setError(data.message || "비밀번호가 올바르지 않습니다.");
      return;
    }

    setPassword("");
    setSessionState("signed-in");
    setNotice("관리자 모드에 들어왔어요.");
  }

  async function handleLogout() {
    await fetch("/api/admin/session", {
      method: "DELETE",
      credentials: "include"
    });
    setRequests([]);
    setSessionState("signed-out");
    setNotice("로그아웃했습니다.");
  }

  async function handleRequestAction(id: string, action: "approve" | "dismiss") {
    setBusyId(id);
    setError("");
    setNotice("");

    const response = await fetch(`/api/admin/requests/${id}`, {
      method: action === "approve" ? "POST" : "DELETE",
      credentials: "include"
    });

    const data = (await response.json()) as { message?: string };
    if (!response.ok) {
      setError(data.message || "요청 처리에 실패했습니다.");
      setBusyId(null);
      return;
    }

    setRequests((prev) => prev.filter((item) => item.id !== id));
    setBusyId(null);
    setNotice(action === "approve" ? "요청을 반영했습니다." : "요청을 무시하고 삭제했습니다.");
  }

  if (sessionState === "loading") {
    return (
      <main className="admin-shell">
        <div className="admin-card admin-loading">
          <Loader2 size={22} aria-hidden />
          관리자 화면을 확인하는 중입니다.
        </div>
      </main>
    );
  }

  if (sessionState === "signed-out") {
    return (
      <main className="admin-shell">
        <section className="admin-card admin-login">
          <div className="admin-title">
            <Shield size={22} aria-hidden />
            <div>
              <h1>관리자 로그인</h1>
              <p>주소로만 들어올 수 있는 관리자 페이지입니다.</p>
            </div>
          </div>

          <form className="admin-form" onSubmit={handleLogin}>
            <label className="admin-label" htmlFor="admin-password">
              비밀번호
            </label>
            <input
              className="input"
              id="admin-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호를 입력하세요"
              type="password"
              value={password}
            />
            <button className="button" type="submit">
              <Shield size={16} aria-hidden />
              들어가기
            </button>
          </form>

          {error ? <p className="admin-error">{error}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <section className="admin-card">
        <div className="admin-header">
          <div className="admin-title">
            <Building2 size={22} aria-hidden />
            <div>
              <h1>신청 검토</h1>
              <p>들어온 요청을 승인하거나 무시할 수 있습니다.</p>
            </div>
          </div>

          <div className="admin-actions">
            <span className="admin-count">{requestCountLabel}</span>
            <button className="button secondary" onClick={loadRequests} type="button">
              새로고침
            </button>
            <button className="button secondary" onClick={handleLogout} type="button">
              <LogOut size={16} aria-hidden />
              로그아웃
            </button>
          </div>
        </div>

        {error ? <p className="admin-error">{error}</p> : null}
        {notice ? <p className="admin-notice">{notice}</p> : null}

        {loadingRequests ? (
          <div className="admin-empty">
            <Loader2 size={20} aria-hidden />
            요청을 불러오는 중입니다.
          </div>
        ) : requests.length ? (
          <div className="admin-list">
            {requests.map((request) => (
              <article className="admin-request" key={request.id}>
                <div className="admin-request-head">
                  <div>
                    <div className="admin-request-kicker">
                      <span className="badge">{request.entity_type}</span>
                      <span className="badge">{request.action_type}</span>
                    </div>
                    <h2>{request.title}</h2>
                    <p>{request.details || "추가 설명 없음"}</p>
                  </div>
                  <span className="admin-request-date">{formatDate(request.created_at)}</span>
                </div>

                <dl className="admin-meta">
                  <div>
                    <dt>음식점 ID</dt>
                    <dd>{request.restaurant_id || "없음"}</dd>
                  </div>
                  <div>
                    <dt>메뉴 ID</dt>
                    <dd>{request.menu_id || "없음"}</dd>
                  </div>
                </dl>

                <pre className="admin-payload">{JSON.stringify(request.payload, null, 2)}</pre>

                <div className="admin-request-actions">
                  <button
                    className="button"
                    disabled={busyId === request.id}
                    onClick={() => handleRequestAction(request.id, "approve")}
                    type="button"
                  >
                    <Check size={16} aria-hidden />
                    수락
                  </button>
                  <button
                    className="button secondary"
                    disabled={busyId === request.id}
                    onClick={() => handleRequestAction(request.id, "dismiss")}
                    type="button"
                  >
                    <X size={16} aria-hidden />
                    무시
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-empty">대기 중인 신청이 없습니다.</div>
        )}
      </section>
    </main>
  );
}
