import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FaArrowUp } from "react-icons/fa";

const MarketCap = () => {
  return (
    <div className="bg-[#10182A] min-h-screen text-white font-inter p-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* PMGT Token Price */}
        <Card className="bg-[#181F36] rounded-2xl shadow-md border-0">
          <CardHeader>
            <CardTitle className="text-3xl font-semibold">PMGT Token Price</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-[#0DF6A9]/10 text-[#0DF6A9] px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                <FaArrowUp /> 8.2%
              </span>
            </div>
            <div className="text-[#B0B8D1] mt-2">Current market value</div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#0DF6A9] mb-2">$0.1842</div>
            {/* Simple chart mockup */}
            <div className="w-full h-32 mt-4 flex items-end">
              <svg width="100%" height="100%" viewBox="0 0 300 120">
                <polyline
                  fill="none"
                  stroke="#0DF6A9"
                  strokeWidth="3"
                  points="0,80 50,80 100,75 150,70 200,60 250,50 300,40"
                />
                <text x="0" y="115" fill="#B0B8D1" fontSize="14">Jan</text>
                <text x="50" y="115" fill="#B0B8D1" fontSize="14">Feb</text>
                <text x="100" y="115" fill="#B0B8D1" fontSize="14">Mar</text>
                <text x="150" y="115" fill="#B0B8D1" fontSize="14">Apr</text>
                <text x="200" y="115" fill="#B0B8D1" fontSize="14">May</text>
                <text x="250" y="115" fill="#B0B8D1" fontSize="14">Jun</text>
                <text x="285" y="115" fill="#B0B8D1" fontSize="14">Jul</text>
                {/* Y axis labels */}
                <text x="0" y="20" fill="#B0B8D1" fontSize="14">220</text>
                <text x="0" y="60" fill="#B0B8D1" fontSize="14">110</text>
                <text x="0" y="100" fill="#B0B8D1" fontSize="14">0</text>
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* PMGT Market Cap */}
        <Card className="bg-[#181F36] rounded-2xl shadow-md border-0">
          <CardHeader>
            <CardTitle className="text-3xl font-semibold">PMGT Market Cap</CardTitle>
            <div className="text-[#B0B8D1] mt-2">Total market value</div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#A259FF] mb-2">$12.4M</div>
            <div className="flex items-center gap-2 text-[#0DF6A9] font-semibold mb-2">
              <FaArrowUp /> +14.2% from last month
            </div>
            {/* Progress bar */}
            <div className="w-full h-4 bg-[#232B45] rounded-full mt-6 mb-2 flex items-center">
              <div className="h-4 rounded-full bg-gradient-to-r from-[#0DF6A9] to-[#A259FF]" style={{ width: "67%" }}></div>
            </div>
            <div className="flex justify-between text-[#B0B8D1] text-sm">
              <span>Supply: 67.2M PMGT</span>
              <span>Max: 100M PMGT</span>
            </div>
          </CardContent>
        </Card>

        {/* Energy Rewards */}
        <Card className="bg-[#181F36] rounded-2xl shadow-md border-0">
          <CardHeader>
            <CardTitle className="text-3xl font-semibold">Energy Rewards</CardTitle>
            <div className="text-[#B0B8D1] mt-2">Tokens earned from production</div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#FFD600] mb-2">142,568 PMGT</div>
            {/* Rewards breakdown */}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-white">Solar Production</span>
              <span className="text-[#0DF6A9] font-semibold">82%</span>
            </div>
            <div className="w-full h-3 bg-[#232B45] rounded-full mb-2">
              <div className="h-3 rounded-full bg-[#0DF6A9]" style={{ width: "82%" }}></div>
            </div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-white">Stakeholder Bonuses</span>
              <span className="text-[#A259FF] font-semibold">12%</span>
            </div>
            <div className="w-full h-3 bg-[#232B45] rounded-full mb-2">
              <div className="h-3 rounded-full bg-[#A259FF]" style={{ width: "12%" }}></div>
            </div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-white">Community Rewards</span>
              <span className="text-[#FFD600] font-semibold">6%</span>
            </div>
            <div className="w-full h-3 bg-[#232B45] rounded-full mb-2">
              <div className="h-3 rounded-full bg-[#FFD600]" style={{ width: "6%" }}></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Featured Solar Projects */}
      <div className="mt-16">
        <h2 className="text-3xl font-bold text-white mb-6">Featured Solar Projects</h2>
        {/* Add your featured projects grid/cards here */}
        <div className="text-[#B0B8D1]">Coming soon...</div>
      </div>
    </div>
  );
};

export default MarketCap;