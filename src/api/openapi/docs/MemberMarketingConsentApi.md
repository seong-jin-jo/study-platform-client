# MemberMarketingConsentApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**updateConsent**](#updateconsent) | **PUT** /api/v6/class-onboarding/me/marketing-consent | |

# **updateConsent**
> BaseResponseMapStringBoolean updateConsent(marketingConsentUpdateRequest)


### Example

```typescript
import {
    MemberMarketingConsentApi,
    Configuration,
    MarketingConsentUpdateRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new MemberMarketingConsentApi(configuration);

let marketingConsentUpdateRequest: MarketingConsentUpdateRequest; //

const { status, data } = await apiInstance.updateConsent(
    marketingConsentUpdateRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **marketingConsentUpdateRequest** | **MarketingConsentUpdateRequest**|  | |


### Return type

**BaseResponseMapStringBoolean**

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

