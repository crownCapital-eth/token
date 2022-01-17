import React from "react";

export default function HeaderBar() {
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
              <a href="https://crowncapital.webflow.io/investors" className="nav-link w-nav-link">
                INVESTORS
              </a>
              <a href="https://crowncapital.webflow.io/gamers" className="nav-link w-nav-link">
                GAMERS
              </a>
              <a href="https://crowncapital.webflow.io/portfolio" className="nav-link w-nav-link">
                PORTFOLIO
              </a>
              <a href="https://crowncapital.webflow.io/community" className="nav-link w-nav-link">
                COMMUNITY
              </a>
              <a href="https://crowncapital.webflow.io/organization" className="nav-link w-nav-link">
                ORGANIZATION
              </a>
            </div>
            <div className="navbar-container-right" />
          </nav>
          <div className="menu-button-container">
            <div
              className="menu-button w-nav-button"
              style={{ WebkitUserSelect: "text" }}
              aria-label="menu"
              role="button"
              tabIndex="0"
              aria-controls="w-nav-overlay-0"
              aria-haspopup="menu"
              aria-expanded="false"
            >
              <img
                src="https://uploads-ssl.webflow.com/61d478ff7ed98c50aa497fe4/61d478ff7ed98c29f04981c7_icons8-squared-menu-100.png"
                loading="lazy"
                width="20"
                alt=""
                className="menu-button-icon"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="w-nav-overlay" data-wf-ignore="" id="w-nav-overlay-0" />
    </div>
  );
}
