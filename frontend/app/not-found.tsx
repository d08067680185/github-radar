import { getDict } from "@/lib/i18n-server";

export default async function NotFound() {
  const t = await getDict();
  return (
    <>
      <h1 className="page-title">{t.nf_title}</h1>
      <p className="page-sub">
        {t.nf_desc} <a href="/">{t.nf_back}</a>
      </p>
    </>
  );
}
