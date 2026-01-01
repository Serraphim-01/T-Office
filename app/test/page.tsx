'use client';

export const dynamic = 'force-dynamic';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-blue-500 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-red-500 mb-4">CSS Test Page</h1>
        <p className="text-gray-700">If you can see styled elements, CSS is working!</p>
        <div className="mt-4 p-4 bg-green-200 rounded">
          <p className="text-green-800">This should have a green background</p>
        </div>
        <button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
          This should be a purple button
        </button>
      </div>
    </div>
  );
}