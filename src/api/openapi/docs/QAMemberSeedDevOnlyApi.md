# QAMemberSeedDevOnlyApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**withdraw**](#withdraw) | **POST** /api/v5/admin/qa/member/withdraw | 회원 탈퇴 처리|

# **withdraw**
> BaseResponseQaMemberWithdrawResponse withdraw(qaMemberWithdrawRequest)

DEV 전용. 선택한 회원을 실제 계정 탈퇴(익명화) 처리한다. 되돌릴 수 없다.

### Example

```typescript
import {
    QAMemberSeedDevOnlyApi,
    Configuration,
    QaMemberWithdrawRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new QAMemberSeedDevOnlyApi(configuration);

let qaMemberWithdrawRequest: QaMemberWithdrawRequest; //

const { status, data } = await apiInstance.withdraw(
    qaMemberWithdrawRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **qaMemberWithdrawRequest** | **QaMemberWithdrawRequest**|  | |


### Return type

**BaseResponseQaMemberWithdrawResponse**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Bearer Token is invalid or no bearer token |  -  |
|**403** | You are authenticated but not allowed authorization |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

