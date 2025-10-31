"use client";

import { useState } from "react";

// The list of tabs to be displayed. It only shows the content of the active tab.
// - icon is optional
// - title is required
// - content is required, it's the content to be displayed when the tab is active
const tabs = [
	{
		id: "1",
		title: "Mobile",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
				className="size-5"
			>
				<path d="M8 16.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z" />
				<path
					fillRule="evenodd"
					d="M4 4a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V4Zm4-1.5v.75c0 .414.336.75.75.75h2.5a.75.75 0 0 0 .75-.75V2.5h1A1.5 1.5 0 0 1 14.5 4v12a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 16V4A1.5 1.5 0 0 1 7 2.5h1Z"
					clipRule="evenodd"
				/>
			</svg>
		),
		content: (
			<div className="space-y-2">
				<p>
					<strong>Device:</strong> iPhone 13 Pro
				</p>
				<p>
					<strong>Screen Size:</strong> 6.1 inches
				</p>
				<p>
					<strong>Resolution:</strong> 2532 x 1170 pixels
				</p>
				<p>
					<strong>Processor:</strong> A15 Bionic chip
				</p>
				<p>
					<strong>RAM:</strong> 6 GB
				</p>
				<p>
					<strong>Storage:</strong> 256 GB
				</p>
				<p>
					<strong>Battery:</strong> 3095 mAh
				</p>
			</div>
		),
	},
	{
		id: "2",
		title: "Tablet",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
				className="size-5"
			>
				<path
					fillRule="evenodd"
					d="M5 1a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V4a3 3 0 0 0-3-3H5ZM3.5 4A1.5 1.5 0 0 1 5 2.5h10A1.5 1.5 0 0 1 16.5 4v12a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 16V4Zm5.25 11.5a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z"
					clipRule="evenodd"
				/>
			</svg>
		),
		content: (
			<div className="space-y-2">
				<p>
					<strong>Device:</strong> iPad Pro (12.9-inch)
				</p>
				<p>
					<strong>Screen Size:</strong> 12.9 inches
				</p>
				<p>
					<strong>Resolution:</strong> 2732 x 2048 pixels
				</p>
				<p>
					<strong>Processor:</strong> A12X Bionic chip
				</p>
				<p>
					<strong>RAM:</strong> 4 GB
				</p>
				<p>
					<strong>Storage:</strong> 256 GB
				</p>
				<p>
					<strong>Battery:</strong> 10000 mAh
				</p>
			</div>
		),
	},
	{
		id: "3",
		title: "Desktop",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
				className="size-5"
			>
				<path
					fillRule="evenodd"
					d="M2 4.25A2.25 2.25 0 0 1 4.25 2h11.5A2.25 2.25 0 0 1 18 4.25v8.5A2.25 2.25 0 0 1 15.75 15h-3.105a3.501 3.501 0 0 0 1.1 1.677A.75.75 0 0 1 13.26 18H6.74a.75.75 0 0 1-.484-1.323A3.501 3.501 0 0 0 7.355 15H4.25A2.25 2.25 0 0 1 2 12.75v-8.5Zm1.5 0a.75.75 0 0 1 .75-.75h11.5a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-.75.75H4.25a.75.75 0 0 1-.75-.75v-7.5Z"
					clipRule="evenodd"
				/>
			</svg>
		),
		content: (
			<div className="space-y-2">
				<p>
					<strong>Device:</strong> MacBook Pro (16-inch)
				</p>
				<p>
					<strong>Screen Size:</strong> 16 inches
				</p>
				<p>
					<strong>Resolution:</strong> 3072 x 1920 pixels
				</p>
				<p>
					<strong>Processor:</strong> Apple M3 chip
				</p>
				<p>
					<strong>RAM:</strong> 16 GB
				</p>
				<p>
					<strong>Storage:</strong> 1 TB
				</p>
				<p>
					<strong>Battery:</strong> 10000 mAh
				</p>
			</div>
		),
	},
];

const Tabs = () => {
	const [activeTab, setActiveTab] = useState(tabs[0].id);

	return (
		<section className="max-w-xl mx-auto space-y-4">
			{/* TAB HEADER */}
			<div
				className="grid rounded-xl bg-base-200 p-1"
				style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
			>
				{tabs.map((tab) => (
					<a
						key={tab.id}
						role="tab"
						className={`flex cursor-pointer select-none items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium ${
							activeTab === tab.id
								? "animate-opacity bg-base-100 shadow-sm"
								: "text-base-content/75"
						}`}
						onClick={() => setActiveTab(tab.id)}
					>
						{tab.icon}
						{tab.title}
					</a>
				))}
			</div>

			{/* TAB CONTENT */}
			<div className="animate-opacity" key={activeTab}>
				{tabs.find((tab) => tab.id === activeTab).content}
			</div>
		</section>
	);
};

export default Tabs;
