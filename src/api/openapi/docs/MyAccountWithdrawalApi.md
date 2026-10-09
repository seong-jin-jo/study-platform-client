# MyAccountWithdrawalApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**withdraw2**](#withdraw2) | **DELETE** /api/v6/mypage/account/withdraw | 계정 탈퇴|

# **withdraw2**
> MyAccountWithdrawalResponse withdraw2(myAccountWithdrawalRequest)

마이페이지의 계정 탈퇴 CTA를 처리합니다.  회원 계정은 soft-delete 처리하고, 소셜 로그인 식별자와 프로필/연락처/소개 정보는 비식별화합니다. 빌더 피드, 질문 답변, 게시물, 댓글 등 공개 콘텐츠는 서비스 맥락 보존을 위해 유지하되 작성자 프로필은 `탈퇴한 회원`으로 표시됩니다. 결제/분쟁 대응 기록은 법정 보존 가능성이 있어 삭제하지 않습니다. 

### Example

```typescript
import {
    MyAccountWithdrawalApi,
    Configuration,
    MyAccountWithdrawalRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new MyAccountWithdrawalApi(configuration);

let myAccountWithdrawalRequest: MyAccountWithdrawalRequest; //

const { status, data } = await apiInstance.withdraw2(
    myAccountWithdrawalRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **myAccountWithdrawalRequest** | **MyAccountWithdrawalRequest**|  | |


### Return type

**MyAccountWithdrawalResponse**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | 계정 탈퇴 성공 |  -  |
|**400** | 탈퇴 동의 누락 |  -  |
|**404** | 탈퇴 가능한 계정 없음 |  -  |
|**409** | 이미 계정 탈퇴 처리됨 |  -  |
|**401** | Bearer Token is invalid or no bearer token |  -  |
|**403** | You are authenticated but not allowed authorization |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

