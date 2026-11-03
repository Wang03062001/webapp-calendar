// Vietnamese source strings, then English / Japanese / Korean / Traditional Chinese (Taiwan).
// Translation affects interface copy only; user-entered financial records remain unchanged.
const rows = `
Lương & thưởng|Salary & bonus|給与・賞与|급여 및 상여|薪資與獎金
Chi từ ngân hàng|Bank spending|銀行からの支出|은행 지출|銀行支出
Mua bằng thẻ tín dụng|Credit card purchases|クレジットカード購入|신용카드 구매|信用卡消費
Thanh toán thẻ tín dụng|Credit card payment|クレジットカード支払い|신용카드 결제|信用卡繳款
Thanh toán thẻ hiển thị riêng, không cộng lại vào chi phí.|Card payments are shown separately and excluded from costs.|カード支払いは別表示で、費用に重複計上しません。|카드 결제는 별도 표시하며 비용에 중복 합산하지 않습니다.|信用卡繳款另行顯示，不重複計入費用。
Thiết lập số dư trực tiếp chưa khả dụng ở ngày thường.|Direct balance setup is unavailable on ordinary days.|通常日は残高を直接設定できません。|일반 날짜에는 잔액 직접 설정을 사용할 수 없습니다.|一般日期無法直接設定餘額。
Dùng Đối chiếu cuối tháng trên trang để cập nhật số dư, không tính lượt.|Use month-end reconciliation on this page; it does not use an update.|このページの月末照合をご利用ください。回数には含まれません。|이 페이지의 월말 대조를 사용하세요. 횟수에 포함되지 않습니다.|請使用本頁的月底核對，不計入次數。
Đã dùng|Used|使用済み|사용|已使用
/3 lượt cập nhật thành công trong tháng hiện tại. Hủy hoặc lưu lỗi không tính lượt.|/3 successful updates this month. Canceled or failed saves do not count.|/3 回（今月の保存成功分）。取消や保存失敗は含みません。|/3회 이번 달 저장 성공. 취소 또는 저장 실패는 포함되지 않습니다.|/3 次本月成功更新。取消或儲存失敗不計次。
Yêu cầu thêm|Request an update|追加更新を申請|추가 요청|申請更新
Không thể cập nhật số dư cho ngày tương lai.|Future balances cannot be updated.|未来日の残高は更新できません。|미래 날짜의 잔액은 업데이트할 수 없습니다.|無法更新未來日期的餘額。
Yêu cầu cập nhật số dư|Request a balance update|残高更新の申請|잔액 업데이트 요청|申請更新餘額
Số dư thực tế cuối ngày|Actual end-of-day balances|一日の終了時の実際の残高|하루 마감 실제 잔액|當日結束時的實際餘額
Giữ nguyên hạn mức và dư nợ thẻ.|Card limit and debt remain unchanged.|カード限度額と債務残高は変わりません。|카드 한도와 부채는 유지됩니다.|信用卡額度與欠款維持不變。
Cập nhật số dư|Balance update|残高更新|잔액 업데이트|更新餘額
Xác nhận cập nhật số dư|Confirm balance update|残高更新を確認|잔액 업데이트 확인|確認更新餘額
Ghi chú chênh lệch được lưu vào ngày đã chọn cùng lịch sử. Số dư thực tế áp dụng từ cuối ngày đó; không sửa hoặc tạo thêm khoản chi.|Differences are saved with history on the selected date. Actual balances apply at that day's end; expenses are unchanged.|差額は選択日の履歴に保存されます。実残高はその日末から適用され、支出は変更しません。|차액은 선택한 날짜의 기록에 저장됩니다. 실제 잔액은 해당 날짜 마감부터 적용되며 지출은 변경하지 않습니다.|差額會連同歷史記錄儲存在所選日期。實際餘額自當日結束起適用，不修改支出。
Số dư đã cập nhật. Ghi chú chênh lệch được lưu cùng lịch sử.|Balances updated. Difference notes are saved with history.|残高を更新しました。差額メモは履歴に保存されました。|잔액을 업데이트했습니다. 차액 메모는 기록에 저장됩니다.|餘額已更新。差額備註已儲存在歷史記錄中。
Đã dùng hết 3 lượt cập nhật số dư trong tháng.|All 3 monthly balance updates have been used.|今月の残高更新は3回すべて使用済みです。|이번 달 잔액 업데이트 3회를 모두 사용했습니다.|本月 3 次餘額更新已用完。
Cập nhật số dư không hợp lệ.|Invalid balance update.|残高更新が無効です。|유효하지 않은 잔액 업데이트입니다.|餘額更新無效。
Ngày đã thay đổi. Đóng và mở lại để kiểm tra.|The date changed. Close and reopen to review.|日付が変わりました。閉じて再度開き確認してください。|날짜가 변경되었습니다. 닫고 다시 열어 확인하세요.|日期已變更。請關閉後重新開啟確認。
Chưa lưu được thay đổi. Kiểm tra đồng bộ và thử lại.|Changes were not saved. Check sync and retry.|保存できませんでした。同期を確認して再試行してください。|변경 사항이 저장되지 않았습니다. 동기화를 확인하고 다시 시도하세요.|尚未儲存變更。請檢查同步後重試。
Phí chỉ hiển thị trong sao kê và đã nằm trong tổng thanh toán; không cộng vào tổng chi tiêu hoặc trừ ngân hàng thêm lần nữa.|Fees appear only on statements and are included in the payment total; they do not add spending or another bank debit.|手数料は明細の支払総額に含まれ、支出や銀行引落しに重複計上しません。|수수료는 명세서 결제 총액에 포함되며 지출이나 은행 출금에 중복 반영하지 않습니다.|費用只在帳單顯示且已含於繳款總額，不另計支出或再次扣銀行餘額。

Tài sản còn lại|Remaining assets|残りの資産|남은 자산|剩餘資產
Ngân hàng + tiền mặt|Bank + cash|銀行＋現金|은행 + 현금|銀行＋現金
Loại giao dịch|Transaction type|取引の種類|거래 유형|交易類型
Rút tiền mặt|Cash withdrawal|現金引き出し|현금 인출|提領現金
Nạp tiền vào ngân hàng|Cash deposit to bank|銀行へ現金入金|은행에 현금 입금|現金存入銀行
Chi tiêu|Spending|支出|지출|支出
Xem|View|表示|보기|查看
Chuyển giữa ngân hàng và tiền mặt; tổng tài sản không đổi.|Transfers between bank and cash keep total assets unchanged.|銀行と現金間の振替では資産合計は変わりません。|은행과 현금 간 이체는 총자산을 변경하지 않습니다.|銀行與現金之間轉移不改變總資產。
Đối chiếu cuối tháng|Month-end reconciliation|月末残高の照合|월말 잔액 대조|月底餘額核對
Thiết lập số dư đầu ngày trước khi đối chiếu.|Set opening balances before reconciling.|照合前に期首残高を設定してください。|대조 전에 기초 잔액을 설정하세요.|核對前請先設定期初餘額。
Nhập tiền thực có cuối ngày, sau mọi giao dịch. Xác nhận sẽ dùng số thực tế làm số dư đầu tháng mới và giữ nguyên lịch sử chi tiêu.|Enter actual balances after all transactions on the final day. Confirmation uses them for next month's opening balances and keeps spending history unchanged.|月末の全取引後の実残高を入力します。確認後は翌月の期首残高に使い、支出履歴は保持します。|월말 모든 거래 후의 실제 잔액을 입력하세요. 확인하면 다음 달 기초 잔액에 반영하며 지출 내역은 유지됩니다.|請輸入月底所有交易後的實際餘額。確認後將作為下月期初餘額，並保留支出紀錄。
Ngân hàng thực tế|Actual bank balance|銀行の実残高|은행 실제 잔액|銀行實際餘額
Tiền mặt thực tế|Actual cash balance|現金の実残高|현금 실제 잔액|實際現金餘額
Kiểm tra chênh lệch|Review differences|差額を確認|차액 확인|檢查差額
Chưa đến ngày cuối tháng.|The final day of the month has not arrived.|まだ月末日ではありません。|아직 월말이 아닙니다.|尚未到月底。
Lịch sử đối chiếu|Reconciliation history|照合履歴|대조 내역|核對紀錄
Xác nhận đối chiếu cuối tháng|Confirm month-end balances|月末残高を確定|월말 잔액 확인|確認月底餘額
Ngân hàng theo sổ:|Recorded bank balance:|銀行の帳簿残高：|은행 장부 잔액:|銀行帳面餘額：
Ngân hàng thực tế:|Actual bank balance:|銀行の実残高：|은행 실제 잔액:|銀行實際餘額：
Chênh lệch ngân hàng:|Bank difference:|銀行の差額：|은행 차액:|銀行差額：
Tiền mặt theo sổ:|Recorded cash balance:|現金の帳簿残高：|현금 장부 잔액:|現金帳面餘額：
Tiền mặt thực tế:|Actual cash balance:|現金の実残高：|현금 실제 잔액:|實際現金餘額：
Chênh lệch tiền mặt:|Cash difference:|現金の差額：|현금 차액:|現金差額：
Tổng chênh lệch:|Total difference:|差額合計：|총 차액:|總差額：
Ghi chú chênh lệch sẽ được thêm vào ngày cuối tháng. Số dư thực tế được chuyển sang tháng mới; không sửa hoặc tạo thêm khoản chi.|A difference note is added to the final day. Actual balances carry to the new month; no expenses are changed or added.|差額メモを月末日に追加します。実残高を翌月に繰り越し、支出は変更・追加しません。|월말에 차액 메모를 추가합니다. 실제 잔액은 다음 달로 이월되며 지출을 수정하거나 추가하지 않습니다.|差額備註將加入月底當天。實際餘額結轉下月，不修改或新增支出。
Xác nhận số dư thực tế|Confirm actual balances|実残高を確定|실제 잔액 확인|確認實際餘額
Đã ghi nhận đối chiếu|Reconciliation recorded|照合を記録しました|대조 기록 완료|已記錄核對
Số dư tháng mới đã cập nhật. Ghi chú chênh lệch được lưu cùng lịch sử.|New-month balances updated. The difference note is saved in history.|翌月残高を更新し、差額メモを履歴に保存しました。|다음 달 잔액을 업데이트하고 차액 메모를 내역에 저장했습니다.|已更新下月餘額，差額備註已保存於紀錄。
Bản nháp đối chiếu đã được giữ trên máy. Kiểm tra trạng thái đồng bộ.|Reconciliation draft kept on this device. Check sync status.|照合の下書きを端末に保持しました。同期状態を確認してください。|대조 초안을 기기에 보관했습니다. 동기화 상태를 확인하세요.|核對草稿已保留於此裝置，請確認同步狀態。

Thu nhập sau chi trực tiếp & dự phòng thẻ|Income after direct spending & card reserve|直接支出とカード確保額を引いた収入|직접 지출 및 카드 준비금 차감 후 수입|扣除直接支出與信用卡預留金後的收入
Số tiền thanh toán|Payment amount|支払額|결제 금액|付款金額

Số dư theo nguồn tiền|Balances by source|資金源別残高|자금별 잔액|各資金來源餘額
Tính đến cuối ngày|As of end of day|日終了時点|해당 일 마감 기준|截至當日結束
Số dư đầu ngày|Opening balance on|開始日の期首残高|시작일 기초 잔액|起始日的期初餘額
Chưa thiết lập số dư đầu ngày|Opening balances not set|期首残高が未設定|기초 잔액 미설정|尚未設定期初餘額
Thiết lập số dư|Set opening balances|期首残高を設定|기초 잔액 설정|設定期初餘額
Chưa thiết lập|Not set|未設定|미설정|尚未設定
Tài khoản ngân hàng|Bank account|銀行口座|은행 계좌|銀行帳戶
Tiền mặt|Cash|現金|현금|現金
Nguồn tiền|Funding source|資金源|자금 출처|資金來源
Nguồn thanh toán|Payment source|支払元|결제 자금 출처|付款來源
Nơi nhận thu nhập|Income destination|収入の受取先|수입 입금처|收入入帳來源
Mục đích chi tiêu|Spending purpose|支出目的|지출 목적|支出用途
Hạn mức khả dụng PayPay|Available PayPay credit|PayPay利用可能額|PayPay 사용 가능 한도|PayPay 可用額度
Cần nhập / đối chiếu hạn mức|Enter / reconcile credit limit|利用枠の入力・照合が必要|한도 입력 / 대조 필요|請輸入／核對信用額度
Dư nợ ghi sổ:|Recorded debt:|記録上の債務：|기록된 부채:|帳面債務：
Số dư dựa trên các giao dịch đã ghi; không kết nối trực tiếp với ngân hàng. Khoản cũ chưa có nguồn được tính là tiền mặt. Thu nhập chưa chọn nơi nhận được tính vào ngân hàng.|Balances use recorded transactions, without a live bank connection. Old expenses without a source use cash. Income without a destination uses bank.|記録した取引に基づき計算します。銀行とは接続していません。資金源のない過去の支出は現金、受取先のない収入は銀行扱いです。|기록한 거래로 계산하며 은행과 직접 연결되지 않습니다. 출처 없는 기존 지출은 현금, 입금처 없는 수입은 은행으로 처리합니다.|餘額依已記錄交易計算，未直接連線銀行。舊支出未指定來源時視為現金，收入未指定入帳來源時視為銀行。
Cần đối chiếu dư nợ đầu kỳ và giao dịch thẻ: tiền đã trả vượt dư nợ ghi sổ.|Reconcile opening debt and purchases: repayments exceed recorded debt.|期首債務と取引の照合が必要です。返済額が記録上の債務を超えています。|기초 부채와 카드 거래를 대조하세요. 상환액이 기록된 부채를 초과합니다.|請核對期初債務及信用卡交易：還款超過帳面債務。
Tiền ra ngân hàng / tiền mặt trong tháng|Bank / cash outflow this month|今月の銀行・現金支出|이번 달 은행 / 현금 유출|本月銀行／現金支出
Tiền ra ngân hàng / tiền mặt trong ngày|Bank / cash outflow today|当日の銀行・現金支出|해당 일 은행 / 현금 유출|當日銀行／現金支出
Gồm trả sao kê; chi phí mua bằng thẻ không bị cộng hai lần.|Includes statement payments; card purchases are not counted twice.|明細の支払を含みます。カード購入を二重計上しません。|명세서 결제를 포함하며 카드 구매를 중복 계산하지 않습니다.|包含帳單付款；信用卡消費不重複計算。
Chuyển ngân hàng ↔ tiền mặt|Transfer bank ↔ cash|銀行 ↔ 現金の振替|은행 ↔ 현금 이체|銀行 ↔ 現金轉帳
Lịch sử chuyển tiền|Transfer history|振替履歴|이체 내역|轉帳紀錄
Chưa có chuyển tiền.|No transfers yet.|振替はまだありません。|이체 내역이 없습니다.|尚無轉帳。
Chuyển tiền nội bộ|Internal transfer|口座間振替|내 계좌 간 이체|內部轉帳
Xóa chuyển tiền|Delete transfer|振替を削除|이체 삭제|刪除轉帳
Ngày bắt đầu theo dõi|Tracking start date|記録開始日|추적 시작일|追蹤起始日期
Ngân hàng đầu ngày|Opening bank balance|銀行期首残高|은행 기초 잔액|銀行期初餘額
Tiền mặt đầu ngày|Opening cash balance|現金期首残高|현금 기초 잔액|現金期初餘額
Dư nợ PayPay đầu ngày|Opening PayPay debt|PayPay期首債務|PayPay 기초 부채|PayPay 期初債務
Hạn mức PayPay (không bắt buộc)|PayPay credit limit (optional)|PayPay利用枠（任意）|PayPay 한도 (선택)|PayPay 信用額度（選填）
Nhập số dư trước mọi giao dịch trong ngày bắt đầu. Dư nợ đầu ngày gồm cả nợ cũ, mua hàng và phí chưa trả trước ngày đó. Giao dịch từ ngày bắt đầu trở đi sẽ được cộng/trừ; không nhập lại số dư cuối ngày vào đây.|Enter balances before all transactions on the start date. Opening card debt includes earlier unpaid debt, purchases and fees. Transactions from the start date are then applied; do not enter end-of-day balances here.|開始日の取引前の残高を入力します。期首債務には前日までの未払債務・購入・手数料を含めます。開始日以降の取引を加減するため、終日の残高は入力しないでください。|시작일의 모든 거래 전 잔액을 입력하세요. 기초 부채는 이전 미납 부채, 구매와 수수료를 포함합니다. 시작일 이후 거래가 반영되므로 마감 잔액을 입력하지 마세요.|請輸入起始日所有交易前的餘額。期初債務包含此前尚未償還的舊債、消費及費用。系統會計入起始日後的交易，請勿在此輸入期末餘額。
Ngày chuyển|Transfer date|振替日|이체일|轉帳日期
Nơi nhận|Destination|振替先|입금처|收款來源
Chuyển giữa hai nguồn của bạn không tạo thêm thu nhập hoặc chi phí.|Transfers between your own sources do not create income or expenses.|自分の口座間の振替は収入・費用に計上しません。|자신의 자금 간 이체는 수입이나 비용을 만들지 않습니다.|自己的資金來源之間轉帳不產生額外收入或費用。
Xóa giao dịch chuyển tiền này sẽ hoàn lại số dư của cả hai nguồn.|Deleting this transfer reverses its effect on both balances.|削除すると両方の残高への影響を元に戻します。|이체를 삭제하면 양쪽 잔액에 대한 영향이 취소됩니다.|刪除此轉帳將復原兩個來源的餘額變動。
Chi phí phát sinh|Incurred costs|発生費用|발생 비용|已發生費用
Thanh toán thẻ|Card payment|カード支払|카드 결제|信用卡付款
Thanh toán liên kết sao kê|Linked statement payment|明細連動の支払|명세서 연결 결제|連結帳單付款
Hủy thanh toán trong Thẻ & sao kê|Undo payment in Card & statements|カード・明細で支払を取消|카드 및 명세서에서 결제 취소|在信用卡與帳單中取消付款
Thanh toán sao kê · không cộng lại chi phí. Sửa/hủy trong Thẻ & sao kê.|Statement payment · not a second expense. Edit/undo in Card & statements.|明細支払・費用の二重計上はしません。カード・明細で編集・取消。|명세서 결제 · 비용 중복 계산 없음. 카드 및 명세서에서 수정/취소.|帳單付款・不重複計入費用。請在信用卡與帳單中修改／取消。
Tạo một dòng thanh toán liên kết trong mục chi tiêu vào ngày trả. Dòng này giảm nguồn tiền và không cộng lại chi phí mua hàng.|Adds a linked payment to the daily expense list on the payment date. It reduces the funding source without counting purchases twice.|支払日に支出一覧へ連動行を追加します。資金源を減額し、購入費用を二重計上しません。|결제일의 지출 목록에 연결된 결제를 추가합니다. 자금 잔액은 줄지만 구매 비용을 중복 계산하지 않습니다.|付款日會在支出清單新增連結付款，扣減付款來源但不重複計入消費費用。

Đổi ngôn ngữ sẽ chọn tiền tệ tương ứng cho cả hai nhóm. Bạn vẫn có thể chọn tiền tệ khác thủ công trước khi lưu.|Changing language selects the matching currency for both groups. You can still choose different currencies manually before saving.|言語を変更すると両グループの通貨を選択します。保存前に通貨を手動で変更できます。|언어를 변경하면 두 그룹의 통화가 함께 선택됩니다. 저장 전에 통화를 직접 변경할 수 있습니다.|變更語言會為兩個群組選擇對應幣別，儲存前仍可手動選擇其他幣別。

Xóa tài khoản|Delete account|アカウントを削除|계정 삭제|刪除帳戶
Xóa vĩnh viễn tài khoản:|Permanently delete account:|アカウントを完全に削除：|계정 영구 삭제:|永久刪除帳戶：
Tài khoản và dữ liệu trên máy chủ sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.|The account and its server data will be permanently deleted. This cannot be undone.|アカウントとサーバー上のデータを完全に削除します。元に戻せません。|계정과 서버의 데이터가 영구 삭제됩니다. 되돌릴 수 없습니다.|帳戶及其伺服器資料將永久刪除，此操作無法復原。
Bạn có chắc chắn muốn xóa?|Are you sure you want to delete?|削除してもよろしいですか？|정말 삭제하시겠습니까?|確定要刪除嗎？
Đã xóa tài khoản.|Account deleted.|アカウントを削除しました。|계정을 삭제했습니다.|已刪除帳戶。
Đã xóa tài khoản nhưng chưa tải lại được danh sách. Hãy thử tải lại.|Account deleted but the list could not be refreshed. Please reload.|削除しましたが一覧を更新できませんでした。再読み込みしてください。|계정이 삭제되었지만 목록을 새로고침하지 못했습니다. 다시 불러오세요.|已刪除帳戶，但無法重新載入清單，請重試。
Không thể tự xóa tài khoản admin đang sử dụng.|You cannot delete your own active admin account.|使用中の管理者アカウントは削除できません。|사용 중인 본인 관리자 계정은 삭제할 수 없습니다.|無法刪除目前登入的管理員帳戶。
Cần xác nhận đúng tài khoản cần xóa.|Confirm the correct account before deleting.|削除するアカウントを確認してください。|삭제할 계정을 정확히 확인하세요.|請確認要刪除的正確帳戶。
Thông tin tài khoản đã thay đổi. Tải lại danh sách trước khi xóa.|Account details changed. Refresh the list before deleting.|情報が変更されました。削除前に一覧を更新してください。|계정 정보가 변경되었습니다. 삭제 전에 목록을 새로고침하세요.|帳戶資料已變更，請先重新載入清單再刪除。
Chưa xóa được tài khoản. Hãy tải lại danh sách và kiểm tra trước khi thử lại.|Account could not be deleted. Reload and check the list before retrying.|削除できませんでした。一覧を再読み込みして確認してください。|계정을 삭제하지 못했습니다. 목록을 다시 불러와 확인한 후 재시도하세요.|無法刪除帳戶。請重新載入並確認清單後再試。

Hãy đăng nhập trước khi nhập dữ liệu.|Sign in before entering data.|入力前にログインしてください。|데이터를 입력하기 전에 로그인하세요.|輸入資料前請先登入。
Hãy đăng nhập trước khi lưu dữ liệu.|Sign in before saving data.|保存前にログインしてください。|저장하기 전에 로그인하세요.|儲存資料前請先登入。
Hãy đăng nhập để đồng bộ.|Sign in to sync.|同期するにはログインしてください。|동기화하려면 로그인하세요.|請登入以同步。
Không thể lưu trên trình duyệt. Hãy xuất dữ liệu để tránh mất thay đổi.|Cannot save in this browser. Export your data to keep changes.|ブラウザに保存できません。変更を保つためデータを書き出してください。|브라우저에 저장할 수 없습니다. 변경 사항을 보존하려면 내보내세요.|無法在此瀏覽器儲存，請匯出資料以保留變更。
Phí liên kết sao kê · sửa trong Thẻ & sao kê.|Statement-linked fee · edit in Card & statements.|明細に連動する手数料・カード明細で編集。|명세서 연결 수수료 · 카드 및 명세서에서 수정.|連結帳單的費用・請在信用卡與帳單中修改。
Liên kết trả nợ · Sửa/hủy trong Khoản vay khác.|Linked repayment · edit/cancel in Other loans.|返済に連動・その他の借入で編集・取消。|연결된 상환 · 기타 대출에서 수정/취소.|連結還款・請在其他借款中修改／取消。
Phí liên kết sao kê|Statement-linked fee|明細連動手数料|명세서 연결 수수료|連結帳單的費用
Khoản chi liên kết trả nợ|Repayment-linked expense|返済連動支出|상환 연결 지출|連結還款的支出
Sửa phí trong Thẻ & sao kê|Edit fees in Card & statements|カード明細で手数料を編集|카드 및 명세서에서 수수료 수정|在信用卡與帳單中修改費用
Hủy lần trả trong Khoản vay khác|Cancel repayments in Other loans|その他の借入で返済を取り消す|기타 대출에서 상환 취소|在其他借款中取消還款
Nhập số tiền dạng 1,000,000; có thể nhập tối đa 3 chữ số thập phân.|Enter an amount such as 1,000,000, with up to 3 decimal places.|1,000,000の形式で入力してください。小数は3桁までです。|1,000,000 형식으로 입력하세요. 소수점은 최대 3자리입니다.|請輸入如 1,000,000 的金額，最多可有 3 位小數。
Số tiền vượt giới hạn cho phép.|Amount exceeds the allowed limit.|金額が上限を超えています。|금액이 허용 한도를 초과했습니다.|金額超過允許上限。
Nhập số tiền lớn hơn 0, tối đa 3 chữ số thập phân.|Enter an amount above zero, with up to 3 decimals.|0より大きい金額を小数3桁以内で入力。|0보다 큰 금액을 소수점 3자리 이내로 입력하세요.|請輸入大於 0 的金額，最多 3 位小數。
Nhập số tiền không âm, tối đa 3 chữ số thập phân.|Enter a nonnegative amount, with up to 3 decimals.|0以上の金額を小数3桁以内で入力。|0 이상의 금액을 소수점 3자리 이내로 입력하세요.|請輸入非負金額，最多 3 位小數。
Số tiền phải lớn hơn 0 và có tối đa 3 chữ số thập phân.|Amount must be above zero with up to 3 decimals.|金額は0より大きく、小数3桁以内にしてください。|금액은 0보다 커야 하며 소수점은 최대 3자리입니다.|金額須大於 0，且最多 3 位小數。
Số tiền trả vượt số nợ còn lại.|Repayment exceeds the remaining debt.|返済額が残債を超えています。|상환 금액이 남은 부채를 초과합니다.|還款金額超過剩餘債務。
Nợ gốc không thể nhỏ hơn tổng tiền đã trả.|Principal cannot be below the amount repaid.|元本は返済済み金額以上にしてください。|원금은 상환한 총액보다 작을 수 없습니다.|本金不得低於已償還總額。
Tiền tệ đã thay đổi. Đóng và mở lại để kiểm tra.|Currency changed. Close and reopen to review.|通貨が変わりました。閉じて再度開いてください。|통화가 변경되었습니다. 닫고 다시 열어 확인하세요.|幣別已變更，請關閉後重新開啟確認。
Khoản nợ đã thay đổi. Đóng và mở lại để kiểm tra.|Debt changed. Close and reopen to review.|借入が変わりました。閉じて再度開いてください。|부채가 변경되었습니다. 닫고 다시 열어 확인하세요.|債務已變更，請關閉後重新開啟確認。
Sao kê đã thay đổi. Đóng và mở lại để kiểm tra.|Statement changed. Close and reopen to review.|明細が変わりました。閉じて再度開いてください。|명세서가 변경되었습니다. 닫고 다시 열어 확인하세요.|帳單已變更，請關閉後重新開啟確認。
Thêm năm hiện tại để xem hôm nay.|Add the current year to view today.|今日を見るには今年を追加してください。|오늘을 보려면 현재 연도를 추가하세요.|新增目前年度以查看今天。
Năm này đã có trong danh sách.|This year is already listed.|この年は追加済みです。|이미 목록에 있는 연도입니다.|此年度已在清單中。
Cần giữ ít nhất một năm.|Keep at least one year.|少なくとも1年を残してください。|최소 한 연도를 유지하세요.|請至少保留一個年度。
Bản sao lưu phải nhỏ hơn 10 MB.|Backup must be smaller than 10 MB.|バックアップは10 MB未満にしてください。|백업은 10 MB 미만이어야 합니다.|備份須小於 10 MB。
Đã nhập bản nháp. Nhấn Lưu thay đổi để đồng bộ.|Draft imported. Press Save changes to sync.|下書きを読み込みました。変更を保存して同期してください。|초안을 가져왔습니다. 변경 사항 저장을 눌러 동기화하세요.|已匯入草稿，請按儲存變更以同步。
Thay bản nháp trên máy bằng dữ liệu đám mây? Hãy xuất dữ liệu trước nếu cần giữ bản nháp.|Replace this device's draft with cloud data? Export first to keep the draft.|端末の下書きをクラウドのデータに置き換えますか？必要なら先に書き出してください。|기기의 초안을 클라우드 데이터로 바꿀까요? 보존하려면 먼저 내보내세요.|要以雲端資料取代此裝置的草稿嗎？如需保留，請先匯出。
Nhập bản sao lưu sẽ thay thế toàn bộ dữ liệu hiện tại trên trình duyệt này. Bạn đã xuất dữ liệu cần giữ chưa?|Importing replaces all current data in this browser. Have you exported anything you need to keep?|読み込むとブラウザ内の全データが置き換わります。必要なデータは書き出しましたか？|가져오면 브라우저의 모든 현재 데이터가 교체됩니다. 필요한 데이터를 내보냈나요?|匯入會取代此瀏覽器目前的所有資料。已匯出需要保留的資料嗎？
Có bản nháp chưa đồng bộ. Đăng xuất và giữ bản nháp trên máy để đồng bộ khi đăng nhập lại?|There is an unsynced draft. Sign out and keep it on this device for your next sign-in?|未同期の下書きがあります。端末に保持してログアウトしますか？|동기화되지 않은 초안이 있습니다. 다음 로그인을 위해 기기에 보관하고 로그아웃할까요?|有未同步草稿。要登出並保留於此裝置，待下次登入時同步嗎？
Thử đồng bộ lại|Retry sync|同期を再試行|동기화 재시도|重試同步
Xuất bản nháp|Export draft|下書きを書き出す|초안 내보내기|匯出草稿
Tải bản đám mây|Load cloud version|クラウド版を読み込む|클라우드 버전 불러오기|載入雲端版本
Đang tải dữ liệu tài khoản. Vui lòng chờ trước khi chỉnh sửa.|Loading account data. Please wait before editing.|アカウントデータ読込中です。編集までお待ちください。|계정 데이터를 불러오는 중입니다. 편집 전에 기다려 주세요.|正在載入帳戶資料，請稍候再編輯。
Chưa lưu được thay đổi. Vui lòng thử lại.|Changes could not be saved. Try again.|変更を保存できませんでした。再試行してください。|변경 사항을 저장하지 못했습니다. 다시 시도하세요.|尚未儲存變更，請重試。
Kiểm tra email để xác nhận tài khoản.|Check your email to confirm your account.|メールでアカウントを確認してください。|이메일을 확인하여 계정을 인증하세요.|請查看電子郵件以驗證帳戶。
Hai mật khẩu chưa khớp.|Passwords do not match.|パスワードが一致しません。|비밀번호가 일치하지 않습니다.|兩次密碼不一致。
Đã đổi mật khẩu. Bạn có thể đóng cửa sổ này và tiếp tục sử dụng.|Password changed. Close this window to continue.|パスワードを変更しました。この画面を閉じて続けられます。|비밀번호를 변경했습니다. 창을 닫고 계속 사용하세요.|已變更密碼，可以關閉視窗繼續使用。
Mã được gửi nếu email đã đăng ký.|A code is sent if the email is registered.|登録済みメールの場合、コードを送信します。|등록된 이메일이면 코드를 전송합니다.|若該電子郵件已註冊，將寄送驗證碼。
Email hoặc mật khẩu chưa đúng.|Incorrect email or password.|メールまたはパスワードが違います。|이메일 또는 비밀번호가 올바르지 않습니다.|電子郵件或密碼不正確。
Hãy xác nhận email trước khi đăng nhập.|Confirm your email before signing in.|ログイン前にメールを確認してください。|로그인 전에 이메일을 인증하세요.|登入前請先驗證電子郵件。
Bạn đã thử quá nhiều lần. Hãy chờ một lát rồi thử lại.|Too many attempts. Wait a moment and try again.|試行回数が多すぎます。しばらく待って再試行してください。|시도 횟수가 너무 많습니다. 잠시 후 다시 시도하세요.|嘗試次數過多，請稍候再試。
Mật khẩu chưa đủ mạnh. Hãy dùng ít nhất 8 ký tự.|Use a stronger password with at least 8 characters.|8文字以上の強いパスワードにしてください。|8자 이상의 강력한 비밀번호를 사용하세요.|請使用至少 8 個字元的強密碼。
Mã xác nhận không đúng hoặc đã hết hạn. Hãy yêu cầu mã mới.|Code is incorrect or expired. Request a new one.|コードが違うか期限切れです。新しいコードを要求してください。|코드가 틀렸거나 만료되었습니다. 새 코드를 요청하세요.|驗證碼錯誤或已過期，請重新取得。
Tên tài khoản đã được dùng, bị dành riêng hoặc không hợp lệ.|Username is taken, reserved or invalid.|ユーザー名は使用済み・予約済み、または無効です。|이미 사용 중이거나 예약된 또는 유효하지 않은 사용자 이름입니다.|使用者名稱已被使用、保留或無效。
Chưa hoàn tất xác nhận email mới.|New email verification is not complete.|新しいメールの確認が未完了です。|새 이메일 확인이 완료되지 않았습니다.|尚未完成新電子郵件驗證。
Không thực hiện được thao tác.|Action could not be completed.|操作を完了できませんでした。|작업을 완료하지 못했습니다.|無法完成操作。
Không kết nối được Supabase. Bản nháp vẫn được giữ trên máy; hãy kiểm tra mạng và thử lại.|Cannot connect to Supabase. Your draft stays on this device; check the network and retry.|Supabaseに接続できません。下書きは端末に保持されています。接続を確認して再試行してください。|Supabase에 연결할 수 없습니다. 초안은 기기에 보관됩니다. 네트워크를 확인하고 다시 시도하세요.|無法連線至 Supabase。草稿保留於此裝置，請檢查網路後重試。
Dữ liệu đã thay đổi trên thiết bị khác. Bản nháp của bạn được giữ lại; hãy xuất bản nháp trước khi tải bản trên đám mây.|Data changed on another device. Your draft is kept; export it before loading the cloud version.|別の端末でデータが変更されました。下書きを書き出してからクラウド版を読み込んでください。|다른 기기에서 데이터가 변경되었습니다. 초안을 내보낸 후 클라우드 버전을 불러오세요.|資料已在其他裝置變更。草稿會保留，載入雲端版本前請先匯出。
dự kiến|estimated|予定|예정|預計

Xem riêng từng tháng|View individual months|月別に表示|월별로 보기|查看各月份
Chọn tháng để xem tổng thu, chi và tiết kiệm của tháng đó.|Select a month to view its income, spending and savings totals.|月を選ぶと、その月の収入・支出・貯蓄の合計を表示します。|월을 선택하면 해당 월의 총수입, 지출, 저축을 확인할 수 있습니다.|選擇月份以查看該月的收入、支出與儲蓄總額。
Không có khoản chi khớp bộ lọc.|No expenses match the filter.|条件に一致する支出はありません。|필터와 일치하는 지출이 없습니다.|沒有符合篩選條件的支出。
Kế hoạch tiết kiệm|Savings plan|貯蓄計画|저축 계획|儲蓄計畫
Tổng kết theo tháng|Monthly summaries|月別集計|월별 결산|每月總結
Điều hướng chính|Main navigation|メインナビゲーション|주요 탐색|主要導覽
Lọc khoản nợ|Filter debts|借入を絞り込む|부채 필터|篩選債務
Ví dụ: Vay mua xe|For example: car loan|例：自動車ローン|예: 자동차 대출|例如：購車貸款
Ví dụ: quang_01|For example: user_01|例：user_01|예: user_01|例如：user_01
Ít nhất 8 ký tự|At least 8 characters|8文字以上|8자 이상|至少 8 個字元
Còn nợ|Outstanding|残債|남은 부채|尚欠
khoản|items|件|건|筆
DK|Est.|予定|예정|預計
Dư nợ sẽ tăng lại và khoản chi liên kết được gỡ. Lịch sử vẫn được giữ.|The debt balance increases again and its linked expense is removed. History is preserved.|残債を戻し、関連支出を削除します。履歴は保持されます。|부채 잔액이 복원되고 연결된 지출이 삭제됩니다. 내역은 유지됩니다.|債務餘額將恢復，並移除連結支出，保留紀錄。
Xóa khoản nợ chưa có lịch sử thanh toán này?|Delete this debt with no repayment history?|返済履歴のない借入を削除しますか？|상환 내역이 없는 이 부채를 삭제할까요?|刪除此筆尚無還款紀錄的債務？
Hủy đánh dấu đã thanh toán, trả sao kê về trạng thái chờ trả. Giao dịch mua hàng và phí vẫn giữ nguyên.|Undo the paid status and return the bill to unpaid. Purchases and fees are preserved.|支払済みを取り消し、明細を未払いに戻します。購入と手数料は保持されます。|결제 완료를 취소하고 미결제로 되돌립니다. 구매와 수수료는 유지됩니다.|取消已付款狀態，恢復為待付款。消費與費用維持不變。
Xác nhận ngân hàng đã trích|Confirm the bank debited|銀行の引落額を確認|은행 출금액 확인|確認銀行已扣款
cho sao kê|for statement|対象明細|명세서|帳單
Sau thanh toán, nợ gốc リボ còn|After payment, revolving principal remaining is|支払後のリボ元本残額|결제 후 남은 리볼빙 원금|付款後剩餘循環信用本金
Thao tác này không cộng lại chi tiêu.|This does not count spending twice.|支出の二重計上はしません。|지출을 중복 계산하지 않습니다.|此操作不會重複計入支出。
Nợ gốc リボ còn|Revolving principal remaining|リボ元本残額|남은 리볼빙 원금|剩餘循環信用本金
Chức năng này chỉ dành cho admin.|This feature is for admins only.|管理者専用の機能です。|관리자 전용 기능입니다.|此功能僅限管理員使用。
Chức năng Thẻ & sao kê chỉ dành cho admin.|Card & statements is for admins only.|カード・明細は管理者専用です。|카드 및 명세서는 관리자 전용입니다.|信用卡與帳單僅限管理員使用。
Nhập mã gồm 6 chữ số.|Enter the six-digit code.|6桁のコードを入力してください。|6자리 코드를 입력하세요.|請輸入 6 位數驗證碼。
Mã xác nhận không đúng.|Incorrect verification code.|確認コードが正しくありません。|인증 코드가 올바르지 않습니다.|驗證碼不正確。
Mã hết hạn hoặc đã nhập sai 5 lần. Hãy bắt đầu lại.|Code expired or five attempts failed. Start again.|コードが期限切れ、または5回失敗しました。やり直してください。|코드가 만료되었거나 5회 실패했습니다. 다시 시작하세요.|驗證碼已過期或輸入錯誤 5 次，請重新開始。
Hãy chờ 60 giây trước khi gửi mã mới.|Wait 60 seconds before sending a new code.|再送信まで60秒お待ちください。|새 코드를 보내기 전 60초 기다리세요.|請等待 60 秒後再寄送新驗證碼。
Phiên đăng nhập đã thay đổi.|Your session has changed.|ログイン状態が変わりました。|로그인 세션이 변경되었습니다.|登入狀態已變更。
Cài đặt đã thay đổi. Đóng và mở lại để kiểm tra.|Settings changed. Close and reopen to review.|設定が変わりました。閉じて再度開いてください。|설정이 변경되었습니다. 닫고 다시 열어 확인하세요.|設定已變更，請關閉後重新開啟確認。
Đã lưu sao kê / cài đặt|Statement / settings saved|明細・設定を保存しました|명세서 / 설정 저장 완료|已儲存帳單／設定
Đã hủy xác nhận|Confirmation undone|確認を取り消しました|확인 취소 완료|已取消確認
Thông tin đã được ghi nhận.|Information recorded.|情報を記録しました。|정보가 기록되었습니다.|資料已記錄。
Thông tin khoản nợ đã được ghi nhận.|Debt information recorded.|借入情報を記録しました。|부채 정보가 기록되었습니다.|債務資料已記錄。
Đã thêm khoản nợ|Debt added|借入を追加しました|부채 추가 완료|已新增債務
Đã cập nhật khoản nợ|Debt updated|借入を更新しました|부채 수정 완료|已更新債務
Đã ghi nhận trả một phần|Partial repayment recorded|一部返済を記録しました|일부 상환 기록 완료|已記錄部分還款
Đã xóa khoản nợ|Debt deleted|借入を削除しました|부채 삭제 완료|已刪除債務
Đã hủy lần trả nợ|Payment cancelled|返済を取り消しました|상환 취소 완료|已取消還款
Bản nháp được giữ trên máy; kiểm tra trạng thái đồng bộ.|Draft kept on this device; check sync status.|下書きは端末に保存されています。同期状態を確認してください。|초안은 기기에 보관됩니다. 동기화 상태를 확인하세요.|草稿保留於此裝置，請檢查同步狀態。
Bản nháp đã được giữ trên máy; kiểm tra trạng thái đồng bộ trước khi đóng trang.|Draft kept on this device; check sync before closing.|下書きは端末に保持されています。閉じる前に同期状態を確認してください。|초안은 기기에 보관됩니다. 닫기 전에 동기화를 확인하세요.|草稿已保留於此裝置，關閉頁面前請確認同步狀態。

Lịch của tôi|My calendar|マイカレンダー|내 캘린더|我的行事曆
TÀI CHÍNH CÁ NHÂN|PERSONAL FINANCE|個人の家計管理|개인 재무|個人財務
KHÔNG GIAN CÁ NHÂN|PERSONAL WORKSPACE|個人スペース|개인 공간|個人空間
Không gian cá nhân|Personal workspace|個人スペース|개인 공간|個人空間
Thu chi & kỳ lương|Income & expenses|収支・給与|수입·지출 및 급여|收支與薪資
Tổng kết năm|Year summary|年間集計|연간 결산|年度總結
Tổng kết tháng|Month summary|月間集計|월간 결산|月份總結
Khoản vay khác|Other loans|その他の借入|기타 대출|其他借款
Thẻ & sao kê|Card & statements|カード・明細|카드 및 명세서|信用卡與帳單
KẾ HOẠCH THEO NĂM|YEARLY PLANS|年別プラン|연간 계획|年度計畫
Một chút kế hoạch hôm nay.|A little planning today.|今日の小さな計画。|오늘의 작은 계획.|今天多一點規劃。
Thảnh thơi hơn ngày mai.|More peace of mind tomorrow.|明日はもっと安心。|내일은 더 여유롭게.|明天多一份安心。
Cho những kế hoạch của bạn|For your plans|あなたの計画に|당신의 계획을 위해|為你的計畫
Cài đặt|Settings|設定|설정|設定
Đổi giao diện sáng tối|Toggle light / dark theme|ライト・ダーク切替|밝은 모드·어두운 모드 전환|切換淺色／深色模式
Giao diện|Appearance|表示モード|화면 모드|外觀
Ngôn ngữ|Language|言語|언어|語言
Sáng|Light|ライト|밝게|淺色
Tối|Dark|ダーク|어둡게|深色
Lưu cài đặt|Save settings|設定を保存|설정 저장|儲存設定
Chọn tiền tệ để bắt đầu|Choose currencies to get started|通貨を選んで始める|시작할 통화를 선택하세요|選擇幣別以開始使用
Bắt đầu|Get started|始める|시작하기|開始使用
Tiền tệ theo nhóm|Currencies by group|グループ別の通貨|그룹별 통화|各群組幣別
Thu chi, khoản vay và sao kê|Income, expenses, loans & statements|収支・借入・明細|수입·지출·대출·명세서|收支、借款與帳單
Tiết kiệm và mục tiêu tiết kiệm|Savings & savings goals|貯蓄・貯蓄目標|저축 및 저축 목표|儲蓄與儲蓄目標
Lương, thưởng, chi tiêu, khoản vay và sao kê dùng chung một loại tiền tệ.|Salary, bonuses, expenses, loans and statements share one currency.|給与・賞与・支出・借入・明細は同じ通貨を使います。|급여, 상여금, 지출, 대출, 명세서는 같은 통화를 사용합니다.|薪資、獎金、支出、借款與帳單使用同一幣別。
Tiết kiệm tháng và mục tiêu năm dùng chung một loại tiền tệ.|Monthly savings and yearly goals share one currency.|毎月の貯蓄と年間目標は同じ通貨を使います。|월 저축과 연간 목표는 같은 통화를 사용합니다.|每月儲蓄與年度目標使用同一幣別。
Nhóm đã có dữ liệu. Đổi đơn vị sẽ áp dụng cho toàn bộ các năm và giữ nguyên số tiền, không quy đổi tỷ giá.|This group has records. Changing the unit applies to all years and keeps the amounts; no exchange conversion is applied.|このグループにはデータがあります。通貨単位の変更は全年度に適用され、金額はそのままです。為替換算は行いません。|이 그룹에 데이터가 있습니다. 단위 변경은 모든 연도에 적용되며 금액은 유지됩니다. 환율 변환은 하지 않습니다.|此群組已有資料。變更幣別會套用至所有年度，保留原有金額，不進行匯率換算。
Tôi muốn giữ số tiền và đổi đơn vị của cả nhóm.|Keep the amounts and change the currency for this whole group.|金額を保持し、グループ全体の通貨単位を変更します。|금액을 유지하고 그룹 전체의 통화를 변경합니다.|保留金額並變更整個群組的幣別。
Xác nhận cách đổi đơn vị cho dữ liệu hiện có.|Confirm how to change the currency for existing records.|既存データの通貨単位変更を確認してください。|기존 데이터의 통화 변경 방식을 확인하세요.|請確認既有資料的幣別變更方式。
Đăng nhập|Sign in|ログイン|로그인|登入
Đăng ký|Sign up|新規登録|회원가입|註冊
Đăng xuất|Sign out|ログアウト|로그아웃|登出
Lưu thay đổi|Save changes|変更を保存|변경 사항 저장|儲存變更
Xuất dữ liệu|Export data|データを書き出す|데이터 내보내기|匯出資料
Nhập bản sao lưu JSON|Import JSON backup|JSONバックアップを読み込む|JSON 백업 가져오기|匯入 JSON 備份
Thêm năm|Add year|年を追加|연도 추가|新增年度
Xóa năm|Remove year|年を削除|연도 삭제|移除年度
Chọn năm|Select year|年を選択|연도 선택|選擇年度
Thêm khoản chi|Add expense|支出を追加|지출 추가|新增支出
Thu nhập|Income|収入|수입|收入
Chi tiêu phát sinh|Incurred expenses|発生した支出|발생 지출|已發生支出
Dự kiến chi|Planned spending|支出予定|예정 지출|預計支出
Chênh lệch thu − chi|Income minus spending|収支差額|수입 − 지출|收支差額
Lương + thưởng|Salary + bonus|給与＋賞与|급여 + 상여금|薪資＋獎金
Thu nhập − đã chi; chưa tính tiền đầu kỳ|Income minus spending; excludes opening funds|収入−支出（期首残高を除く）|수입 − 지출; 기초 잔액 제외|收入減支出；不含期初餘額
khoản · gồm chi bằng thẻ|items · includes card purchases|件・カード利用を含む|건 · 카드 지출 포함|筆・含信用卡消費
khoản chưa chi|planned items|件の支出予定|미지출 건|筆尚未支出
Biểu đồ phân tích|Analysis charts|分析グラフ|분석 차트|分析圖表
Thu nhập & chi tiêu|Income & spending|収入と支出|수입 및 지출|收入與支出
Đã chi theo danh mục|Spending by category|分類別支出|분류별 지출|各類別支出
Chưa có khoản đã chi trong kỳ này.|No spending in this period.|この期間の支出はありません。|이 기간의 지출이 없습니다.|此期間尚無支出。
Quỹ tiết kiệm của bạn|Your savings|あなたの貯蓄|나의 저축|你的儲蓄
Mục tiêu tiết kiệm năm|Yearly savings goal|年間貯蓄目標|연간 저축 목표|年度儲蓄目標
Tiết kiệm tháng|Monthly savings|毎月の貯蓄|월 저축|每月儲蓄
TIẾT KIỆM|SAVINGS|貯蓄|저축|儲蓄
Tiết kiệm|Savings|貯蓄|저축|儲蓄
Quỹ tiết kiệm|Savings fund|貯蓄口座|저축 자금|儲蓄資金
được theo dõi riêng với thu chi|is tracked separately from income and expenses in|は収支と別に管理されます：|은 다음 통화의 수입·지출과 별도로 관리됩니다:|與以下幣別的收支分開追蹤：
Đã tiết kiệm trong tháng|Saved this month|今月の貯蓄|이번 달 저축|本月已儲蓄
Đã tiết kiệm trong năm|Saved this year|今年の貯蓄|올해 저축|今年已儲蓄
Tiến độ tiết kiệm năm|Yearly savings progress|年間貯蓄の進捗|연간 저축 진행률|年度儲蓄進度
Chưa đặt mục tiêu|No goal set|目標未設定|목표 미설정|尚未設定目標
Đặt mục tiêu để theo dõi tiến độ|Set a goal to track progress|目標を設定して進捗を確認|목표를 설정하여 진행률 확인|設定目標以追蹤進度
Đã đạt mục tiêu năm!|Yearly goal reached!|年間目標達成！|연간 목표 달성!|已達成年度目標！
Còn thiếu|Remaining|あと|남은 금액|尚差
mục tiêu|of goal|目標|목표|目標
Lịch tháng|Monthly calendar|月間カレンダー|월별 캘린더|月曆
Mỗi ngày một kế hoạch nhỏ|A small plan for every day|毎日に小さな計画を|매일의 작은 계획|每天一點小計畫
Hôm nay|Today|今日|오늘|今天
Tháng trước|Previous month|前月|이전 달|上個月
Tháng sau|Next month|翌月|다음 달|下個月
Chọn tháng|Select month|月を選択|월 선택|選擇月份
THỨ 2|MON|月|월|週一
THỨ 3|TUE|火|화|週二
THỨ 4|WED|水|수|週三
THỨ 5|THU|木|목|週四
THỨ 6|FRI|金|금|週五
THỨ 7|SAT|土|토|週六
CN|SUN|日|일|週日
Ngày đang chọn|Selected day|選択した日|선택한 날짜|所選日期
Đã chi tháng|Monthly spending|今月の支出|월 지출|本月支出
Dự kiến|Planned|予定|예정|預計
Đã chi|Spent|支出済み|지출 완료|已支出
Có ghi chú|Has a note|メモあり|메모 있음|有備註
Thu nhập tháng|Monthly income|月収|월 수입|每月收入
Ghi lại lương và những khoản thưởng của bạn|Record your salary and bonuses|給与と賞与を記録|급여와 상여금을 기록하세요|記錄薪資與獎金
Lương thực nhận|Take-home salary|手取り給与|실수령 급여|實領薪資
Thưởng & thu nhập thêm|Bonus & other income|賞与・その他の収入|상여금 및 추가 수입|獎金與其他收入
Lương của tháng|Salary earned in|給与対象月|급여 귀속 월|薪資所屬月份
Ngày nhận tiền|Date received|受取日|입금일|入帳日期
Ghi chú thu nhập|Income notes|収入メモ|수입 메모|收入備註
Ví dụ: Lương cơ bản, thưởng dự án, ngày nhận lương…|Base salary, project bonus, payday…|基本給、プロジェクト賞与、給料日など|기본급, 프로젝트 상여금, 급여일 등|例如：底薪、專案獎金、發薪日…
Tổng thu nhập tháng|Total monthly income|月の収入合計|월 총수입|每月總收入
CHI TIÊU TRONG NGÀY|DAILY EXPENSES|日々の支出|일일 지출|每日支出
Chọn ngày nhập chi tiêu|Choose expense date|支出日を選択|지출 날짜 선택|選擇支出日期
Chọn ngày|Select date|日付を選択|날짜 선택|選擇日期
Các khoản chi|Expenses|支出一覧|지출 내역|支出項目
Nội dung khoản chi|Expense description|支出内容|지출 내용|支出內容
Số tiền khoản chi|Expense amount|支出金額|지출 금액|支出金額
Số tiền|Amount|金額|금액|金額
Danh mục khoản chi|Expense category|支出分類|지출 분류|支出類別
Danh mục|Category|分類|분류|類別
Trạng thái khoản chi|Expense status|支出の状態|지출 상태|支出狀態
Trạng thái|Status|状態|상태|狀態
Thanh toán bằng|Payment method|支払方法|결제 수단|付款方式
Phương thức khoản chi|Expense payment method|支出の支払方法|지출 결제 수단|支出付款方式
Tiền mặt / tài khoản|Cash / bank account|現金・銀行口座|현금 / 은행 계좌|現金／銀行帳戶
Thẻ tín dụng|Credit card|クレジットカード|신용카드|信用卡
Cách trả thẻ khoản chi|Card repayment method|カードの支払区分|카드 상환 방식|信用卡付款方式
Cách trả|Repayment method|支払区分|상환 방식|付款方式
Một lần tháng sau · 1回|One payment next month · 1回|翌月一括・1回|다음 달 일시불 · 1回|下月一次付清・1回
Bổ sung vào リボ|Added to revolving balance|リボ追加額|리볼빙 추가|新增循環信用
Phí sao kê|Statement fee|明細手数料|명세서 수수료|帳單費用
Kỳ sao kê trả tiền|Payment statement month|支払明細月|결제 명세서 월|帳單付款月份
Kỳ sao kê khoản chi|Expense statement month|支出の明細月|지출 명세서 월|支出帳單月份
Ghi chú trong ngày|Daily notes|日々のメモ|일일 메모|每日備註
Ghi chú|Notes|メモ|메모|備註
Tìm kiếm khoản chi trong tháng|Search this month's expenses|今月の支出を検索|이번 달 지출 검색|搜尋本月支出
Tìm nội dung|Search descriptions|内容を検索|내용 검색|搜尋內容
Ví dụ: tiền nhà, ăn uống…|Rent, food, etc.|家賃、食費など|월세, 식비 등|例如：房租、餐飲…
Tất cả danh mục|All categories|すべての分類|모든 분류|所有類別
Tất cả|All|すべて|전체|全部
Ăn uống|Food & dining|食費|식비|餐飲
Nhà ở|Housing|住居費|주거비|住房
Đi lại|Transport|交通費|교통비|交通
Mua sắm|Shopping|買い物|쇼핑|購物
Sức khỏe|Health|健康|건강|健康
Giải trí|Entertainment|娯楽|여가|娛樂
Trả nợ|Debt payment|返済|부채 상환|還款
Khác|Other|その他|기타|其他
Nợ phải trả|Debts payable|返済予定|상환할 부채|應付債務
Tổng nợ gốc|Total principal|元本合計|총 원금|本金總額
Tổng nợ|Total debt|負債合計|총 부채|總債務
Đã trả một phần|Partially repaid|一部返済済み|일부 상환|已部分還款
Đã trả hết|Fully repaid|完済|전액 상환|已全部還清
Đã trả|Repaid|返済済み|상환 완료|已償還
Còn phải trả|Outstanding|返済残額|미상환 금액|尚待償還
Các khoản nợ|Debts|借入一覧|부채 내역|債務項目
Thanh toán được ghi vào chi tiêu|Payments are recorded as expenses in|返済は支出として記録：|상환금은 다음 통화의 지출로 기록됩니다:|還款計入以下幣別支出：
đúng ngày trả.|on the repayment date.|返済日。|상환일 기준.|以還款日期為準。
Thêm khoản nợ|Add debt|借入を追加|부채 추가|新增債務
Quá hạn|Overdue|延滞|연체|逾期
Đến hạn trong 7 ngày|Due within 7 days|7日以内に返済|7일 이내 만기|7 天內到期
Sắp đến hạn|Due soon|まもなく返済日|곧 만기|即將到期
Đến hạn|Due|返済日|만기|到期
Đã hoàn tất|Completed|完了|완료|已完成
Chưa thanh toán|Unpaid|未払い|미결제|尚未付款
Chưa đặt ngày đến hạn|No due date set|返済日未設定|만기일 미설정|尚未設定到期日
Nợ gốc|Principal|元本|원금|本金
Còn lại|Remaining|残額|잔액|剩餘
Hoàn tất|Complete|完了|완료|完成
Sửa khoản nợ|Edit debt|借入を編集|부채 수정|編輯債務
Xóa khoản nợ|Delete debt|借入を削除|부채 삭제|刪除債務
Sửa|Edit|編集|수정|編輯
Xóa|Delete|削除|삭제|刪除
Lịch sử|History|履歴|내역|紀錄
lần trả|payments|回返済|회 상환|次還款
đã hủy|cancelled|取消済み|취소됨|已取消
Đã hủy|Cancelled|取消済み|취소됨|已取消
Hủy lần trả nợ|Cancel debt payment|返済を取り消す|부채 상환 취소|取消還款
Hủy lần trả|Cancel payment|返済を取り消す|상환 취소|取消還款
Không có khoản nợ khớp bộ lọc.|No debts match the filter.|条件に一致する借入はありません。|필터와 일치하는 부채가 없습니다.|沒有符合篩選條件的債務。
Chưa có khoản nợ. Thêm khoản nợ để bắt đầu theo dõi.|No debts yet. Add a debt to start tracking.|借入はまだありません。追加して管理を始めましょう。|부채가 없습니다. 부채를 추가하여 관리하세요.|尚無債務。新增債務以開始追蹤。
Vay cá nhân|Personal loan|個人借入|개인 대출|個人借款
Trả góp|Installments|分割払い|할부|分期付款
Vay ngân hàng|Bank loan|銀行ローン|은행 대출|銀行貸款
Xác nhận trả nợ|Confirm repayment|返済を確認|상환 확인|確認還款
Tên khoản nợ|Debt name|借入名|부채 이름|債務名稱
Loại nợ|Debt type|借入の種類|부채 유형|債務類型
Ngày đến hạn (không bắt buộc)|Due date (optional)|返済日（任意）|만기일 (선택)|到期日（選填）
Cách thanh toán|Repayment option|返済方法|상환 옵션|還款方式
Trả hết|Repay in full|全額返済|전액 상환|全額還清
Trả một phần|Partial repayment|一部返済|일부 상환|部分還款
Ngày trả|Payment date|返済日|상환일|還款日期
Số tiền trả|Payment amount|返済額|상환 금액|還款金額
Xác nhận thanh toán|Confirm payment|支払を確認|결제 확인|確認付款
Xác nhận hủy lần trả|Confirm cancellation|返済取消を確認|상환 취소 확인|確認取消還款
Xác nhận xóa|Confirm deletion|削除を確認|삭제 확인|確認刪除
Lưu khoản nợ|Save debt|借入を保存|부채 저장|儲存債務
Chúc mừng!|Congratulations!|おめでとうございます！|축하합니다!|恭喜！
Số nợ còn lại|Outstanding balance|残債|남은 부채|剩餘債務
Hủy|Cancel|キャンセル|취소|取消
Đóng|Close|閉じる|닫기|關閉
Tài khoản|Account|アカウント|계정|帳戶
Thông tin tài khoản|Account details|アカウント情報|계정 정보|帳戶資料
Tên tài khoản hoặc email|Username or email|ユーザー名またはメール|사용자 이름 또는 이메일|使用者名稱或電子郵件
Tên tài khoản|Username|ユーザー名|사용자 이름|使用者名稱
Tên hiển thị|Display name|表示名|표시 이름|顯示名稱
Mật khẩu mới|New password|新しいパスワード|새 비밀번호|新密碼
Mật khẩu|Password|パスワード|비밀번호|密碼
Nhập lại mật khẩu|Confirm password|パスワードの確認|비밀번호 확인|確認密碼
Quên mật khẩu|Forgot password|パスワードをお忘れですか|비밀번호 찾기|忘記密碼
Đổi mật khẩu|Change password|パスワード変更|비밀번호 변경|變更密碼
Đặt mật khẩu mới|Set new password|新しいパスワードを設定|새 비밀번호 설정|設定新密碼
Lưu mật khẩu mới|Save new password|新しいパスワードを保存|새 비밀번호 저장|儲存新密碼
Quản lý tài khoản|Manage accounts|アカウント管理|계정 관리|管理帳戶
QUẢN TRỊ|ADMINISTRATION|管理|관리|管理
Chỉnh sửa tên/email, khóa tài khoản hoặc gửi email đặt lại mật khẩu.|Edit profiles, verify email changes, suspend accounts or send password resets.|プロフィール編集、メール変更確認、利用停止、パスワード再設定。|프로필 수정, 이메일 변경 확인, 계정 차단 및 비밀번호 재설정.|編輯資料、驗證電子郵件變更、停用帳戶或寄送密碼重設郵件。
Lưu hồ sơ|Save profile|プロフィールを保存|프로필 저장|儲存個人資料
Đổi email|Change email|メール変更|이메일 변경|變更電子郵件
Xác nhận email cũ|Verify current email|現在のメールを確認|기존 이메일 확인|驗證原電子郵件
Nhập email mới|Enter new email|新しいメールを入力|새 이메일 입력|輸入新電子郵件
Xác nhận email mới|Verify new email|新しいメールを確認|새 이메일 확인|驗證新電子郵件
Email hiện tại chỉ thay đổi sau khi xác nhận email mới thành công.|Your current email changes only after the new email is verified.|新しいメールの確認が完了するまで、現在のメールは変更されません。|새 이메일 확인이 완료된 후에만 기존 이메일이 변경됩니다.|只有成功驗證新電子郵件後，才會變更目前的電子郵件。
Gửi mã đến email cũ|Send code to current email|現在のメールにコード送信|기존 이메일로 코드 보내기|寄送驗證碼至原電子郵件
Gửi mã đến email mới|Send code to new email|新しいメールにコード送信|새 이메일로 코드 보내기|寄送驗證碼至新電子郵件
Xác nhận mã email cũ|Verify current-email code|現在のメールのコードを確認|기존 이메일 코드 확인|驗證原電子郵件驗證碼
Xác nhận email mới và hoàn tất|Verify new email and finish|新しいメールを確認して完了|새 이메일 확인 및 완료|驗證新電子郵件並完成
Mã từ email cũ|Code from current email|現在のメールのコード|기존 이메일의 코드|原電子郵件驗證碼
Mã từ email mới|Code from new email|新しいメールのコード|새 이메일의 코드|新電子郵件驗證碼
Email mới|New email|新しいメール|새 이메일|新電子郵件
Bắt đầu lại / gửi lại mã|Restart / resend code|やり直す・コード再送|다시 시작 / 코드 재전송|重新開始／重寄驗證碼
Đã xác nhận email cũ. Hãy nhập email mới.|Current email verified. Enter your new email.|現在のメールを確認しました。新しいメールを入力してください。|기존 이메일을 확인했습니다. 새 이메일을 입력하세요.|已驗證原電子郵件。請輸入新電子郵件。
Đã gửi mã xác nhận. Mã có hiệu lực 10 phút.|Verification code sent. It expires in 10 minutes.|確認コードを送信しました。有効期限は10分です。|인증 코드를 보냈습니다. 유효 시간은 10분입니다.|已寄送驗證碼，10 分鐘內有效。
Đã xác nhận và đổi email thành công.|Email verified and changed successfully.|メールを確認し変更しました。|이메일 확인 및 변경이 완료되었습니다.|已成功驗證並變更電子郵件。
Đã cập nhật tài khoản.|Account updated.|アカウントを更新しました。|계정을 업데이트했습니다.|已更新帳戶。
Đang xử lý…|Processing…|処理中…|처리 중…|處理中…
Đang tải tài khoản…|Loading accounts…|アカウント読込中…|계정 로딩 중…|正在載入帳戶…
Đang kết nối…|Connecting…|接続中…|연결 중…|連線中…
Đang lưu…|Saving…|保存中…|저장 중…|儲存中…
Đã lưu thay đổi.|Changes saved.|変更を保存しました。|변경 사항을 저장했습니다.|已儲存變更。
Chưa đăng nhập|Not signed in|未ログイン|로그인하지 않음|尚未登入
Chưa lưu thay đổi|Unsaved changes|未保存の変更|저장하지 않은 변경|尚未儲存變更
Chờ đồng bộ|Waiting to sync|同期待ち|동기화 대기 중|等待同步
Chưa đồng bộ|Not synced|未同期|동기화되지 않음|尚未同步
Cần xử lý thay đổi|Changes need attention|変更の確認が必要|변경 확인 필요|需要處理變更
Đăng nhập để nhập và lưu dữ liệu|Sign in to enter and save data|ログインしてデータを入力・保存|데이터 입력 및 저장을 위해 로그인하세요|登入以輸入及儲存資料
Đang đăng nhập:|Signed in as:|ログイン中：|로그인 계정:|目前登入：
Đang đăng nhập|Current session|ログイン中|현재 로그인|目前登入
Bản nháp chưa đồng bộ sẽ được giữ riêng cho tài khoản này trên trình duyệt.|Unsynced drafts stay in this browser, private to this account.|未同期の下書きは、このブラウザ内でアカウント別に保持されます。|동기화되지 않은 초안은 이 브라우저에 계정별로 보관됩니다.|未同步的草稿會在此瀏覽器中依帳戶分開保存。
Hoạt động|Active|有効|활성|啟用中
Đang khóa|Suspended|利用停止中|차단됨|已停用
Cấp admin|Grant admin|管理者権限を付与|관리자 권한 부여|授予管理員權限
Thu quyền admin|Revoke admin|管理者権限を解除|관리자 권한 회수|撤銷管理員權限
Mở khóa|Unlock|利用再開|차단 해제|解除停用
Khóa|Suspend|利用停止|차단|停用
Đặt lại mật khẩu|Reset password|パスワード再設定|비밀번호 재설정|重設密碼
Thao tác|Actions|操作|작업|操作
Trang trước|Previous page|前のページ|이전 페이지|上一頁
Trang sau|Next page|次のページ|다음 페이지|下一頁
Trang|Page|ページ|페이지|頁
Mã trong email|Email code|メールのコード|이메일 코드|電子郵件驗證碼
Gửi mã|Send code|コード送信|코드 보내기|寄送驗證碼
Xác nhận mã|Verify code|コード確認|코드 확인|驗證代碼
Quay lại đăng nhập|Back to sign in|ログインに戻る|로그인으로 돌아가기|返回登入
THẺ TÍN DỤNG|CREDIT CARD|クレジットカード|신용카드|信用卡
DÒNG TIỀN THÁNG|MONTHLY CASHFLOW|月の資金繰り|월 현금 흐름|每月現金流
Chủ động trước ngày thanh toán|Plan ahead for payment day|支払日前に備える|결제일을 미리 준비하세요|提前準備付款日
Lương tháng trước · Thẻ trả kỳ sau · Tiết kiệm __SAVINGS__ riêng biệt|Previous month's salary · Card paid next cycle · Separate __SAVINGS__ savings|前月分の給与・カードは翌期払い・__SAVINGS__貯蓄は別管理|전월 급여 · 다음 주기 카드 결제 · __SAVINGS__ 저축 별도|前月薪資・信用卡下期付款・__SAVINGS__ 儲蓄分開管理
Nhận lương|Payday|給料日|급여일|領薪日
Công tháng|Work month|勤務月|근무 월|薪資所屬月
Thanh toán thẻ|Card payment|カード支払|카드 결제|信用卡付款
Ngày dự kiến|Expected date|予定日|예정일|預定日期
Giữ lại để trả sao kê|Reserve for card bill|明細支払用の確保額|명세서 결제 준비금|帳單付款預留金
Thu nhập sau chi tiền mặt & dự phòng thẻ|Income after cash spending & card reserve|現金支出とカード支払確保後の収入|현금 지출·카드 준비금 차감 후 수입|扣除現金支出與信用卡預留金後的收入
Chưa tính số dư đầu kỳ và các khoản dự kiến khác|Excludes opening balance and other planned expenses|期首残高・その他の予定支出を除く|기초 잔액 및 기타 예정 지출 제외|不含期初餘額及其他預計支出
Dự kiến; cần bổ sung gốc và phí theo sao kê|Estimate; enter principal and fees from the bill|概算。明細から元本と手数料を入力|예상치; 명세서의 원금과 수수료 입력 필요|預估值；需依帳單補入本金與費用
Xem thẻ & sao kê|View card & statements|カード・明細を見る|카드 및 명세서 보기|查看信用卡與帳單
Chi tiêu mới trả một lần tháng sau. Nợ cũ theo dõi bằng リボ.|New purchases are paid next month. Existing debt is tracked as revolving credit.|新規利用は翌月一括払い。既存の借入はリボで管理。|새 지출은 다음 달 일시불로 결제합니다. 기존 부채는 리볼빙으로 관리합니다.|新增消費於下月一次付清。舊債以循環信用管理。
Lịch thanh toán thẻ|Card payment schedule|カード支払予定|카드 결제 일정|信用卡付款排程
Lịch thanh toán|Payment schedule|支払予定|결제 일정|付款排程
SAO KÊ|STATEMENT|明細|명세서|帳單
Đã chốt · Chưa trả|Confirmed · Unpaid|確定・未払い|확정 · 미결제|已確定・尚未付款
Đã thanh toán kỳ này|This cycle paid|今期支払済み|이번 주기 결제 완료|本期已付款
Theo số tiền bạn nhập từ sao kê|Based on the amounts entered from your bill|入力した明細の金額に基づく|입력한 명세서 금액 기준|依輸入的帳單金額計算
Ước tính từ giao dịch đã ghi; chưa có gốc và phí chính thức|Estimated from recorded purchases; excludes official principal and fees|記録した取引からの概算。正式な元本と手数料は未入力|기록된 거래의 예상치; 확정 원금·수수료 제외|依已記錄交易預估；尚無正式本金與費用
Nợ gốc リボ|Revolving principal|リボ元本|리볼빙 원금|循環信用本金
sau trả|after payment|支払後|결제 후|付款後
trước trả|before payment|支払前|결제 전|付款前
Theo sao kê đã xác nhận thanh toán|Based on the statement marked paid|支払確認済みの明細に基づく|결제 확인된 명세서 기준|依已確認付款的帳單
Chưa trừ gốc chờ thanh toán|Pending principal not yet deducted|支払待ちの元本は未控除|결제 대기 원금 미차감|尚未扣除待付本金
Cần nhập số dư từ sao kê để đối chiếu|Enter the bill balance to reconcile|照合するため明細残高を入力|대조를 위해 명세서 잔액 입력 필요|請輸入帳單餘額以核對
Chi mới dự kiến trả|New purchases payable in|新規利用の支払予定月|새 지출 결제 예정 월|新增消費預計付款月份
Giao dịch trả một lần, không tự chuyển sang リボ|One-off purchases; no automatic revolving transfer|一括払い。自動でリボには移行しません|일시불 거래; 리볼빙 자동 전환 없음|一次付款交易；不自動轉為循環信用
Tiền thực trả thẻ trong tháng|Actual card payments this month|今月のカード支払実績|이번 달 실제 카드 결제액|本月實際信用卡付款
Theo ngày bạn xác nhận đã trích tiền|Based on the confirmed debit date|確認した引落日に基づく|확인된 출금일 기준|依確認的扣款日期
Đối chiếu sao kê|Statement reconciliation|明細の照合|명세서 대조|帳單核對
Trả đủ kỳ này không đồng nghĩa đã hết nợ リボ.|Paying this bill does not mean the revolving debt is cleared.|今期分の支払完了はリボ完済とは異なります。|이번 명세서를 결제해도 리볼빙 부채가 모두 상환되는 것은 아닙니다.|本期繳清不代表循環信用債務已全部清償。
Nhập / sửa sao kê|Enter / edit statement|明細の入力・編集|명세서 입력 / 수정|輸入／編輯帳單
Sửa sao kê|Edit statement|明細を編集|명세서 수정|編輯帳單
Nhập sao kê|Enter statement|明細を入力|명세서 입력|輸入帳單
Trả một lần · 1回|One-off payment · 1回|一括払い・1回|일시불 · 1回|一次付清・1回
Gốc リボ · 元金|Revolving principal · 元金|リボ元金|리볼빙 원금 · 元金|循環信用本金・元金
Phí / lãi · 手数料|Fees / interest · 手数料|手数料・利息|수수료 / 이자 · 手数料|費用／利息・手数料
Tổng phải thanh toán|Total payment due|支払総額|총 결제 예정액|應付總額
Dư nợ trước kỳ|Opening balance|前期繰越残高|기초 잔액|期初餘額
Mới vào リボ|New revolving charges|新規リボ利用|새 리볼빙 금액|新增循環信用
Gốc kỳ này|Principal this cycle|今期元金|이번 주기 원금|本期本金
Dư nợ chuyển kỳ sau|Balance carried forward|翌期繰越残高|다음 주기 이월 잔액|下期結轉餘額
Xác nhận đã thanh toán|Confirm paid|支払済みを確認|결제 완료 확인|確認已付款
Hủy xác nhận thanh toán|Undo payment confirmation|支払確認を取り消す|결제 확인 취소|取消付款確認
Đã thanh toán ngày|Paid on|支払日|결제일|付款日期
Nhập và chốt số tiền theo sao kê trước khi xác nhận thanh toán.|Enter and confirm the bill amounts before marking it paid.|支払確認前に明細の金額を入力・確定してください。|결제 완료 확인 전에 명세서 금액을 입력하고 확정하세요.|標記付款前，請先輸入並確定帳單金額。
Giao dịch trả một lần trong kỳ này|One-off purchases for this cycle|今期の一括払い取引|이번 주기 일시불 거래|本期一次付款交易
Ngày mua được giữ trong báo cáo chi tiêu; số dưới đây hỗ trợ đối chiếu sao kê.|Purchases stay on their purchase dates in spending reports; these figures help reconcile the bill.|支出は購入日に記録されます。以下の金額で明細を照合できます。|지출 보고서는 구매일을 유지하며 아래 금액으로 명세서를 대조합니다.|支出報表保留購買日期；以下金額用於核對帳單。
Đã ghi chi tiết|Recorded purchases|記録済み取引|기록된 거래|已記錄明細
Trả một lần trên sao kê|One-off amount on bill|明細の一括払い額|명세서 일시불 금액|帳單一次付款金額
Chênh|Difference|差額|차액|差額
Chưa đặt tên|Untitled|名称未設定|제목 없음|未命名
Chưa có giao dịch chi tiết. Bạn vẫn có thể nhập tổng chính thức từ sao kê.|No purchase details yet. You can still enter the official bill total.|取引明細はありません。請求書の正式な合計額を入力できます。|상세 거래가 없어도 명세서의 확정 총액을 입력할 수 있습니다.|尚無交易明細。仍可輸入帳單的正式總額。
Lịch sử sao kê năm|Statement history for|年別明細履歴|연간 명세서 내역|年度帳單紀錄
Chưa có sao kê được lưu.|No saved statements.|保存された明細はありません。|저장된 명세서가 없습니다.|尚無已儲存帳單。
Dư nợ リボ đầu kỳ|Opening revolving balance|リボ期首残高|리볼빙 기초 잔액|循環信用期初餘額
Gốc リボ trả kỳ này|Revolving principal this cycle|今期のリボ返済元金|이번 주기 리볼빙 원금|本期償還循環信用本金
Phí / lãi リボ|Revolving fees / interest|リボ手数料・利息|리볼빙 수수료 / 이자|循環信用費用／利息
Ngày xác nhận số tiền|Amount confirmation date|請求確定日|청구 금액 확정일|請款金額確定日
Ngày thanh toán trên sao kê|Payment date on bill|明細の支払日|명세서 결제일|帳單付款日期
Đã chốt theo sao kê|Confirmed from statement|明細に基づき確定|명세서 기준 확정|依帳單確定
Dự kiến, chưa chốt|Estimated, not confirmed|予定・未確定|예정, 미확정|預計，尚未確定
Phí được ghi chi phí một lần vào ngày xác nhận. Tiền mua hàng giữ ở ngày mua, gốc không tạo khoản chi thứ hai.|Fees are expensed once on confirmation. Purchases remain on their purchase dates; principal does not create another expense.|手数料は確定日に一度記録します。購入は購入日に記録し、元金返済で支出を重複計上しません。|수수료는 확정일에 한 번 기록합니다. 구매는 구매일에 유지되며 원금은 지출로 중복 기록하지 않습니다.|費用於確定日計入一次。消費保留購買日期；本金還款不會重複計入支出。
Tên thẻ|Card name|カード名|카드 이름|信用卡名稱
Ngày thanh toán dự kiến|Expected payment day|支払予定日|예상 결제일|預定付款日
Nếu trùng cuối tuần|If on a weekend|週末の場合|주말인 경우|遇週末時
Thứ Sáu trước đó (theo cấu hình của bạn)|Previous Friday (your setting)|直前の金曜日（設定に基づく）|직전 금요일 (사용자 설정)|前一個星期五（依你的設定）
Ngày làm việc kế tiếp|Next weekday|次の平日|다음 평일|下一個平日
Giữ nguyên ngày|Keep the date|日付を変更しない|날짜 유지|維持原日期
Ngày trong từng sao kê được ưu tiên. Có thể sửa khi ngân hàng điều chỉnh ngày nghỉ.|The date on each statement takes priority. Edit it for bank holiday adjustments.|各明細の日付を優先します。銀行休業日の調整は編集できます。|각 명세서 날짜가 우선입니다. 은행 휴일에 따라 수정할 수 있습니다.|以各期帳單日期為準，可依銀行假日調整。
Ngày thực thanh toán|Actual payment date|実際の支払日|실제 결제일|實際付款日期
Xác nhận thanh toán sao kê|Confirm statement payment|明細の支払を確認|명세서 결제 확인|確認帳單付款
Xác nhận hủy|Confirm undo|取消を確認|취소 확인|確認取消
Năm|Year|年|연도|年
Tháng|Month|月|월|月
tháng|month|月|월|月
Ngày|Day|日|일|日
ngày|day|日|일|日
`;
export const translations = Object.fromEntries(rows.trim().split('\n').filter(Boolean).map(row=>{const [key,...values]=row.split('|');return [key,values];}));
