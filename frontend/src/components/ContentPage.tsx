import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function ContentPage({ title, subtitle, children }: Props) {
  const { t } = useTranslation();
  return (
    <>
      <div className="page-hero">
        <div className="wrap">
          <div className="crumb">
            <Link to="/">{t("pages.common.home")}</Link> · {title}
          </div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      <section className="page">
        <div className="wrap">{children}</div>
      </section>
    </>
  );
}
