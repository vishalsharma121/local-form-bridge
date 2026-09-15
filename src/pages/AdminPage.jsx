import { useState, useEffect, useCallback } from 'react';

export default function AdminPage() {
    const [key, setKey] = useState(() => sessionStorage.getItem('admin_key') || '');
    const [inputKey, setInputKey] = useState('');
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const loadContacts = useCallback(async (adminKey) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/contacts', {
                headers: { 'x-admin-key': adminKey },
            });
            if (res.status === 401) {
                sessionStorage.removeItem('admin_key');
                setKey('');
                throw new Error('Invalid admin key');
            }
            if (!res.ok) throw new Error('Failed to load contacts');
            const data = await res.json();
            setContacts(data.contacts || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (key) loadContacts(key);
    }, [key, loadContacts]);

    const handleLogin = (e) => {
        e.preventDefault();
        sessionStorage.setItem('admin_key', inputKey);
        setKey(inputKey);
    };

    if (!key) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm space-y-4">
                    <h2 className="text-xl font-bold text-slate-900">Admin Access</h2>
                    <input
                        type="password"
                        placeholder="Admin key"
                        value={inputKey}
                        onChange={(e) => setInputKey(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600"
                    />
                    <button type="submit" className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm">
                        Enter
                    </button>
                    {error && <p className="text-xs text-red-600">{error}</p>}
                </form>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 sm:p-10">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">Contacts Dashboard</h1>
                    <button
                        onClick={() => loadContacts(key)}
                        className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-sm font-medium hover:bg-slate-50"
                    >
                        Refresh
                    </button>
                </div>

                {loading && <p className="text-sm text-slate-500">Loading…</p>}
                {error && <p className="text-sm text-red-600">{error}</p>}

                {!loading && !error && (
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
                                    <tr>
                                        <th className="px-6 py-3 text-left font-semibold">Name</th>
                                        <th className="px-6 py-3 text-left font-semibold">Email</th>
                                        <th className="px-6 py-3 text-left font-semibold">Phone</th>
                                        <th className="px-6 py-3 text-left font-semibold">Subject</th>
                                        <th className="px-6 py-3 text-left font-semibold">Message</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {contacts.map((c) => (
                                        <tr key={c.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-3 font-medium text-slate-900">{c.name || '—'}</td>
                                            <td className="px-6 py-3 text-slate-600">{c.email || '—'}</td>
                                            <td className="px-6 py-3 text-slate-600">{c.phone || '—'}</td>
                                            <td className="px-6 py-3 text-slate-600">{c.subject || '—'}</td>
                                            <td className="px-6 py-3 text-slate-600 max-w-xs truncate">{c.message || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}