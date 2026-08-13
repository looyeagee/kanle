import { useEffect, useState } from "react";
import { api, uploadFile } from "@/lib/api";
import { getAdmin, setAdmin } from "@/lib/auth";
import { resolveAvatar } from "@/lib/avatar";
import type { User } from "@/lib/types";

export default function SettingsPage() {
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("");
  const [cover, setCover] = useState("");
  const [siteTitle, setSiteTitle] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdOk, setPwdOk] = useState("");

  useEffect(() => {
    api<User>("/profile")
      .then((p) => {
        setNickname(p.nickname || "");
        setAvatar(p.avatar || "");
        setCover(p.cover || "");
        setSiteTitle(p.siteTitle || p.nickname || "");
        setEmail(p.email || "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"));
  }, []);

  const save = async () => {
    if (!nickname.trim()) {
      setError("请填写昵称");
      return;
    }
    setSaving(true);
    setError("");
    setOk("");
    try {
      const profile = await api<User>("/profile", {
        method: "PUT",
        body: JSON.stringify({
          nickname: nickname.trim(),
          avatar,
          cover,
          siteTitle: siteTitle.trim(),
        }),
      });
      const admin = getAdmin();
      if (admin) setAdmin(admin.token, profile.nickname, admin.email);
      setNickname(profile.nickname);
      setAvatar(profile.avatar);
      setCover(profile.cover || "");
      setSiteTitle(profile.siteTitle || profile.nickname);
      setOk("已保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const preview = resolveAvatar(avatar, email, 200);

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold">资料设置</h1>
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-xl bg-wechat-bubble">
          <img src={preview} alt="" className="h-full w-full object-cover" />
        </div>
        <label className="cursor-pointer rounded-lg border border-adm-border px-3 py-2 text-sm text-adm-text-secondary">
          {uploadingAvatar ? "上传中..." : "更换头像"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploadingAvatar}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setUploadingAvatar(true);
              setError("");
              setOk("");
              try {
                const res = await uploadFile("/upload", file);
                if (res.url) setAvatar(res.url);
              } catch (err) {
                setError(err instanceof Error ? err.message : "上传失败");
              } finally {
                setUploadingAvatar(false);
              }
            }}
          />
        </label>
      </div>
      <div>
        <p className="mb-2 text-sm">朋友圈背景图</p>
        <div className="overflow-hidden rounded-xl bg-wechat-bubble">
          {cover ? (
            <img src={cover} alt="朋友圈背景" className="h-36 w-full object-cover" />
          ) : (
            <div className="cover-fallback h-36 w-full" />
          )}
        </div>
        <div className="mt-2 flex gap-2">
          <label className="cursor-pointer rounded-lg border border-adm-border px-3 py-2 text-sm text-adm-text-secondary">
            {uploadingCover ? "上传中..." : "更换背景"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingCover}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setUploadingCover(true);
                setError("");
                setOk("");
                try {
                  const res = await uploadFile("/upload", file);
                  if (res.url) setCover(res.url);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "上传失败");
                } finally {
                  setUploadingCover(false);
                }
              }}
            />
          </label>
          {cover && (
            <button
              type="button"
              className="rounded-lg border border-adm-border px-3 py-2 text-sm text-adm-text-secondary"
              onClick={() => {
                setCover("");
                setOk("");
              }}
            >
              恢复默认
            </button>
          )}
        </div>
      </div>
      <label className="block text-sm">
        昵称
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="mt-1 w-full rounded-xl border border-adm-border bg-adm-input px-3 py-2 outline-none"
        />
      </label>
      <label className="block text-sm">
        网页标题
        <input
          value={siteTitle}
          onChange={(e) => setSiteTitle(e.target.value)}
          placeholder="浏览器标签上显示的标题"
          className="mt-1 w-full rounded-xl border border-adm-border bg-adm-input px-3 py-2 outline-none"
        />
        <span className="mt-1 block text-xs text-adm-text-secondary">
          首页显示此标题；文章页为「文章标题 - 网页标题」
        </span>
      </label>
      {error && <p className="text-sm text-adm-danger">{error}</p>}
      {ok && <p className="text-sm text-wechat-nickname">{ok}</p>}
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-adm-primary px-4 py-2 text-sm text-adm-primary-text disabled:opacity-50"
      >
        {saving ? "保存中..." : "保存"}
      </button>

      <div className="border-t border-adm-border pt-6">
        <h2 className="mb-4 text-base font-semibold">修改密码</h2>
        <div className="space-y-3">
          <label className="block text-sm">
            当前密码
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1 w-full rounded-xl border border-adm-border bg-adm-input px-3 py-2 outline-none"
            />
          </label>
          <label className="block text-sm">
            新密码
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="mt-1 w-full rounded-xl border border-adm-border bg-adm-input px-3 py-2 outline-none"
            />
          </label>
          <label className="block text-sm">
            确认新密码
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="mt-1 w-full rounded-xl border border-adm-border bg-adm-input px-3 py-2 outline-none"
            />
          </label>
          {pwdError && <p className="text-sm text-adm-danger">{pwdError}</p>}
          {pwdOk && <p className="text-sm text-wechat-nickname">{pwdOk}</p>}
          <button
            type="button"
            disabled={savingPwd}
            className="rounded-lg bg-adm-primary px-4 py-2 text-sm text-adm-primary-text disabled:opacity-50"
            onClick={async () => {
              if (!currentPassword || !newPassword) {
                setPwdError("请填写当前密码和新密码");
                return;
              }
              if (newPassword.length < 6) {
                setPwdError("新密码至少 6 位");
                return;
              }
              if (newPassword !== confirmPassword) {
                setPwdError("两次输入的新密码不一致");
                return;
              }
              setSavingPwd(true);
              setPwdError("");
              setPwdOk("");
              try {
                await api("/auth/password", {
                  method: "POST",
                  body: JSON.stringify({ currentPassword, newPassword }),
                });
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setPwdOk("密码已更新");
              } catch (err) {
                setPwdError(err instanceof Error ? err.message : "修改失败");
              } finally {
                setSavingPwd(false);
              }
            }}
          >
            {savingPwd ? "更新中..." : "更新密码"}
          </button>
        </div>
      </div>
    </div>
  );
}
