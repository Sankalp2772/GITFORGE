import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import { BuildEngineSidebar } from './BuildEngineSidebar';
import { BuildEngineProvider } from '../context/BuildEngineContext';
import { BuildEngineTopBar } from './BuildEngineTopBar';

export const BuildEngineLayout: React.FC = () => {
  return (
    <BuildEngineProvider>
      <div className="min-h-screen bg-dark-900 text-dark-100 flex flex-col">
        <Navbar />
        <BuildEngineTopBar />
        <div className="flex-1 flex w-full">
          <BuildEngineSidebar />
          <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </BuildEngineProvider>
  );
};
