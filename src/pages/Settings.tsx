import React from "react";
import Sidebar from '../components/Sidebar';

const Settings: React.FC = () => {
    return (
        <div className="relative flex h-screen overflow-hidden bg-foodle-bg font-sans">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 p-6">
                    <div className="max-w-4xl mx-auto">
                        <h1 className="text-3xl font-bold text-foodle-dark mb-4 flex items-center">
                            <i className="fa-solid fa-gear text-foodle-red mr-3"></i>
                            Settings
                        </h1>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center py-12">
                            <i className="fa-solid fa-gear text-gray-300 text-6xl mb-6"></i>
                            <h2 className="text-2xl font-bold text-gray-600 mb-2">
                                Settings Coming Soon
                            </h2>
                            <p className="text-gray-500 text-lg">
                                App settings and preferences will be available here in a future update.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Settings;
