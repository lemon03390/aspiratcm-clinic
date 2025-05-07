import { useToast } from "../../components/Toast";

export default function QueryAppointmentForm() {
  const { ToastContainer, success, error: showError } = useToast();

  // 使用示例程式碼 - 實際使用時應該替換為真實邏輯
  const handleError = (errorMessage: string) => {
    showError("查詢預約時出錯：" + errorMessage);
  };

  const handleSuccess = () => {
    success("查詢成功");
  };

  return (
    <>
      {/* 原有的組件內容 */}
      <ToastContainer />
    </>
  );
}
