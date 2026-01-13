import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 text-center">Teacher Login</h2>
        
        <div className="space-y-4">
          <input type="email" placeholder="Email Address" className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none" disabled />
          <input type="password" placeholder="Password" className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none" disabled />
          
          <button 
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition disabled:opacity-50 cursor-not-allowed"
            disabled
          >
            Sign In
          </button>
          
          <div className="text-center">
            <button 
              onClick={() => navigate('/dashboard')}
              className="text-sm text-gray-500 hover:text-blue-500 underline"
            >
              Continue in Demo Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}