import React from 'react';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';

async function getRevenueMetrics() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Get MRR (Monthly Recurring Revenue)
  const activeSubscriptions = await db.subscriptionEvent.findMany({
    where: {
      status: 'active',
      type: 'customer.subscription.created',
    },
    orderBy: {
      timestamp: 'desc',
    },
    distinct: ['subscriptionId'],
  });

  const mrr = activeSubscriptions.reduce((total, sub) => {
    // Convert yearly subscriptions to monthly value
    const monthlyAmount = sub.interval === 'year' 
      ? sub.amount / 12 
      : sub.amount;
    return total + monthlyAmount;
  }, 0);

  // Get current month's revenue
  const currentMonthRevenue = await db.revenue.aggregate({
    where: {
      timestamp: {
        gte: startOfMonth,
      },
    },
    _sum: {
      amount: true,
    },
  });

  // Get last month's revenue
  const lastMonthRevenue = await db.revenue.aggregate({
    where: {
      timestamp: {
        gte: startOfLastMonth,
        lt: startOfMonth,
      },
    },
    _sum: {
      amount: true,
    },
  });

  // Get total customers
  const totalCustomers = await db.customer.count({
    where: {
      status: 'active',
    },
  });

  // Get new customers this month
  const newCustomers = await db.customer.count({
    where: {
      createdAt: {
        gte: startOfMonth,
      },
    },
  });

  // Get revenue by plan
  const revenueByPlan = await db.subscriptionEvent.groupBy({
    by: ['planId'],
    where: {
      status: 'active',
    },
    _sum: {
      amount: true,
    },
  });

  return {
    mrr,
    currentMonthRevenue: currentMonthRevenue._sum.amount || 0,
    lastMonthRevenue: lastMonthRevenue._sum.amount || 0,
    totalCustomers,
    newCustomers,
    revenueByPlan,
  };
}

export default async function RevenueDashboard() {
  const session = await getServerSession(authOptions);
  

  const metrics = await getRevenueMetrics();
  const monthlyGrowth = ((metrics.currentMonthRevenue - metrics.lastMonthRevenue) / metrics.lastMonthRevenue) * 100;

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Revenue Dashboard</h1>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* MRR Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Monthly Recurring Revenue</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {formatCurrency(metrics.mrr)}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Current Month Revenue */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Current Month Revenue</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {formatCurrency(metrics.currentMonthRevenue)}
                      </div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {monthlyGrowth >= 0 ? '+' : ''}{monthlyGrowth.toFixed(1)}%
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Total Customers */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Active Customers</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{metrics.totalCustomers}</div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                        +{metrics.newCustomers} this month
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue by Plan */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Revenue by Plan</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metrics.revenueByPlan.map((plan) => (
                  <tr key={plan.planId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {plan.planId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(plan._sum.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
