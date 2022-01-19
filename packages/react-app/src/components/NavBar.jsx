import React from "react";

export default function NavBar() {
  /* Taken from web2 site to match style */
  const web2BaseUrl = "https://www.crowncapital.games";

  return (
    <div
      data-collapse="medium"
      data-animation="default"
      data-duration="400"
      data-easing="ease"
      data-easing2="ease"
      role="banner"
    >
      <div className="navbar-container _1440px">
        <div className="navbar-container-left">
          <a href="#" className="navbar-brand company crown w-nav-brand">
            <img
              src="https://uploads-ssl.webflow.com/61d478ff7ed98c50aa497fe4/61d9d26295d9afcff391480b_logo.png"
              loading="lazy"
              width="34"
              alt=""
              className="logo-crown"
            />
          </a>
          <a href="#" className="navbar-brand game crown w-nav-brand" />
          <nav role="navigation" className="nav-menu w-nav-menu">
            <div>
              <a href={web2BaseUrl + "/investors"} className="nav-link w-nav-link">
                INVESTORS
              </a>
              <a href={web2BaseUrl + "/gamers"} className="nav-link w-nav-link">
                GAMERS
              </a>
              <a href={web2BaseUrl + "/portfolio"} className="nav-link w-nav-link">
                PORTFOLIO
              </a>
              <a href={web2BaseUrl + "/community"} className="nav-link w-nav-link">
                COMMUNITY
              </a>
              <a href={web2BaseUrl + "/organization"} className="nav-link w-nav-link">
                ORGANIZATION
              </a>
            </div>
            <div className="navbar-container-right" />
          </nav>
        </div>
      </div>
      <div className="w-nav-overlay" data-wf-ignore="" id="w-nav-overlay-0" />
    </div>
  );
}
