import { getLocale } from "@/lib/i18n-server";
import { getDictFor } from "@/lib/i18n";
import { localeHref } from "@/lib/locale-link";

export default async function NotFound() {
  const locale = await getLocale();
  const t = getDictFor(locale);
  return (
    <>
      <h1 className="page-title">{t.nf_title}</h1>
      <p className="page-sub">
        {t.nf_desc} <a href={localeHref("/", locale)}>{t.nf_back}</a>
      </p>
    </>
  );
}
