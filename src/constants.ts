import { Question } from './types';

export const MOCK_QUESTIONS: Question[] = [
  {
    id: "rec1",
    code: "FIN-001",
    status: "已发布",
    major: "金融",
    title: "Understanding the CAPM Model",
    content: "Explain the core assumptions of the Capital Asset Pricing Model (CAPM) and how Beta is derived.",
    analysis: "CAPM assumes efficient markets, rational investors, and no transaction costs. Beta is calculated as the covariance of the asset's return with the market return divided by the variance of the market return.",
    link: "https://example.com/capm",
    updatedAt: 1625097600000
  },
  {
    id: "rec2",
    code: "FIN-002",
    status: "已发布",
    major: "金融",
    title: "Impact of Interest Rates on Bonds",
    content: "Describe the inverse relationship between interest rates and bond prices with a mathematical example.",
    analysis: "When interest rates rise, existing bonds with lower coupons become less attractive, dropping in price. Conversely, when rates fall, bond prices rise. Duration measures this sensitivity.",
    link: "https://example.com/bonds",
    updatedAt: 1625184000000
  },
  {
    id: "rec3",
    code: "FIN-003",
    status: "已发布",
    major: "金融",
    title: "Derivatives: Options Pricing",
    content: "What are the key factors affecting the price of a Call Option according to Black-Scholes?",
    analysis: "The 5 factors are: Underlying price, Strike price, Time to expiration, Volatility, and Risk-free rate.",
    link: "https://example.com/options",
    updatedAt: 1625270400000
  },
  {
    id: "rec4",
    code: "FIN-004",
    status: "已发布",
    major: "金融",
    title: "Efficient Market Hypothesis",
    content: "Distinguish between weak, semi-strong, and strong forms of market efficiency.",
    analysis: "Weak: Past prices reflect info. Semi-strong: Public info reflected. Strong: All info (public + private) reflected.",
    link: "https://example.com/emh",
    updatedAt: 1625356800000
  },
  {
    id: "rec5",
    code: "FIN-005",
    status: "已发布",
    major: "金融",
    title: "Fiscal vs Monetary Policy",
    content: "Compare the tools used by Central Banks versus Governments to influence the economy.",
    analysis: "Central Banks (Monetary): Interest rates, OMO, Reserve requirements. Government (Fiscal): Taxation, Government spending.",
    link: "https://example.com/policy",
    updatedAt: 1625443200000
  },
  {
    id: "rec6",
    code: "FIN-006",
    status: "已发布",
    major: "金融",
    title: "WACC Calculation",
    content: "How do taxes shield debt costs in the Weighted Average Cost of Capital calculation?",
    analysis: "Interest payments are tax-deductible, so the cost of debt is multiplied by (1 - Tax Rate).",
    link: "https://example.com/wacc",
    updatedAt: 1625529600000
  },
  {
    id: "rec7",
    code: "FIN-007",
    status: "已发布",
    major: "金融",
    title: "Private Equity Exits",
    content: "List three common exit strategies for a Private Equity firm.",
    analysis: "1. IPO (Initial Public Offering). 2. Trade Sale (sell to strategic buyer). 3. Secondary Buyout (sell to another PE firm).",
    link: "https://example.com/pe",
    updatedAt: 1625616000000
  },
  {
    id: "rec8",
    code: "FIN-008",
    status: "已发布",
    major: "金融",
    title: "Forex: Purchasing Power Parity",
    content: "Explain the concept of Absolute PPP.",
    analysis: "Absolute PPP suggests that a basket of goods should cost the same in two countries when converted to a common currency.",
    link: "https://example.com/ppp",
    updatedAt: 1625702400000
  },
  {
    id: "rec9",
    code: "FIN-009",
    status: "已发布",
    major: "金融",
    title: "Behavioral Finance",
    content: "What is Loss Aversion?",
    analysis: "The psychological phenomenon where the pain of losing is psychologically about twice as powerful as the pleasure of gaining.",
    link: "https://example.com/behavioral",
    updatedAt: 1625788800000
  },
  {
    id: "rec10",
    code: "FIN-010",
    status: "已发布",
    major: "金融",
    title: "ESG Investing",
    content: "Define the three pillars of ESG.",
    analysis: "Environmental (climate change, resources), Social (labor, community), Governance (board structure, ethics).",
    link: "https://example.com/esg",
    updatedAt: 1625875200000
  },
  {
    id: "rec11",
    code: "FIN-011",
    status: "已发布",
    major: "金融",
    title: "Cryptocurrency Valuations",
    content: "Why are traditional DCF models difficult to apply to Bitcoin?",
    analysis: "Bitcoin generates no cash flows (dividends or interest), making DCF impossible without abstract assumptions about transaction utility.",
    link: "https://example.com/crypto",
    updatedAt: 1625961600000
  }
];