import React from "react";
import "./SolutionsPage.css";

const SolutionsPage = () => {
  return (
    <div className="solutions-page">
      <div className="background-effects">
        <div className="grid"></div>
        <div className="scanline"></div>
        <div className="glowing-orb"></div>
        <div className="data-arc data-arc-1"></div>
        <div className="data-arc data-arc-2"></div>
        <div className="data-arc data-arc-3"></div>
      </div>
      <section className="page-header">
        <h1>Tailored Solutions for Your Industry</h1>
        <p>
          Mayday adapts to meet the unique challenges of your business sector.
        </p>
      </section>

      <section className="solutions-grid">
        <div className="solution-card">
          <h3>E-commerce</h3>
          <p>
            Enhance customer support, manage orders, and personalize shopping
            experiences to boost sales and loyalty.
          </p>
        </div>
        <div className="solution-card">
          <h3>Customer Support Centers</h3>
          <p>
            Equip your agents with powerful tools for efficient ticket handling,
            call management, and customer satisfaction.
          </p>
        </div>
        <div className="solution-card">
          <h3>Sales Teams</h3>
          <p>
            Streamline lead management, track sales pipelines, and automate
            follow-ups to close more deals faster.
          </p>
        </div>
        <div className="solution-card">
          <h3>Telecommunications</h3>
          <p>
            Manage subscriber information, handle service requests, and improve
            communication for telecom providers.
          </p>
        </div>
        {/* Add more industry solutions as needed */}
      </section>
    </div>
  );
};

export default SolutionsPage;
