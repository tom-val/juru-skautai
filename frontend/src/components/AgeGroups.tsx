import { useTranslation } from "react-i18next";

interface Group {
  image: string;
  age: string;
  name: string;
  teaser: string;
  full: string;
}

export default function AgeGroups() {
  const { t } = useTranslation();
  const items = t("groups.items", { returnObjects: true }) as Group[];
  return (
    <section id="grupes">
      <div className="wrap">
        <div className="section-head center">
          <span className="eyebrow">{t("groups.eyebrow")}</span>
          <h2>{t("groups.title")}</h2>
        </div>
        <div className="groups">
          {items.map((group, i) => (
            <details className="group" key={i}>
              <summary>
                <div className="banner">
                  <img src={group.image} alt="" />
                  <div className="ov">
                    <span className="age">{group.age}</span>
                    <h3>{group.name}</h3>
                  </div>
                  <span className="more">{t("groups.more")}</span>
                </div>
                <div className="teaser">{group.teaser}</div>
              </summary>
              <div className="desc">{group.full}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
