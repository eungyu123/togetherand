import { CenterModal } from '@/shared/components/modal/CenterModal';
import { useCallStore } from '@/domain/call/store/call';

export default function PermissionDeniedModal() {
  const isPermissionDeniedModalOpen = useCallStore(state => state.isPermissionDeniedModalOpen);
  const { setIsPermissionDeniedModalOpen } = useCallStore.getState();

  return (
    <CenterModal
      isOpen={isPermissionDeniedModalOpen}
      onClose={() => setIsPermissionDeniedModalOpen(false)}
    >
      <div className="relative bg-main-black-800 rounded-xl border border-main-black-700 p-6 max-w-md mx-4">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8  rounded-full flex items-center justify-center mr-3">
            <span className="text-red-500 text-lg">❌</span>
          </div>
          <h3 className="text-lg font-semibold text-white">마이크 권한이 필요합니다</h3>
        </div>

        <div className="mb-6">
          <p className="text-gray-300 mb-4">통화를 위해 마이크 권한을 허용해주세요.</p>

          <h4 className="font-medium text-white mb-2">해결 방법:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
            <li>브라우저 주소창 왼쪽의 🔒 아이콘 클릭</li>
            <li>&ldquo;마이크 권한을 &ldquo;허용&rdquo;으로 변경</li>
            <li>&ldquo;카메라&rdquo; 권한을 &ldquo;허용&rdquo;으로 변경</li>
            <li>페이지를 새로고침하세요</li>
          </ol>
        </div>
      </div>
    </CenterModal>
  );
}
