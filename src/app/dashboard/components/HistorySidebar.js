import { FiLoader, FiInbox } from 'react-icons/fi';

const HistoryItemSkeleton = () => (
    <div className="w-full p-3 rounded-lg bg-white/5 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-white/10 rounded w-1/2"></div>
    </div>
);

export const HistorySidebar = ({ history, onLoad, isLoading }) => (
    <>
      <h3 className="text-xl font-semibold mb-4 text-gray-200">History</h3>
      <div className="flex-grow overflow-y-auto pr-2 space-y-2">
        {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <HistoryItemSkeleton key={i} />)
        ) : history.length > 0 ? (
            history.map(item => (
                <button key={item.id} onClick={() => onLoad(item.id)} className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <p className="font-semibold text-white truncate">{item.title}</p>
                    <p className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString()}</p>
                </button>
            ))
        ) : (
            <div className="text-center text-gray-500 mt-8 flex flex-col items-center p-4">
                <FiInbox className="text-4xl mb-3" />
                <h4 className="font-semibold text-gray-300">No History Yet</h4>
                <p className="text-sm">Your past presentations will appear here once you create them.</p>
            </div>
        )}
      </div>
    </>
);