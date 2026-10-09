# InsightReadingBudgetApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getMyBudget**](#getmybudget) | **GET** /api/v1/insight/reading-budget/me | |
|[**unlock**](#unlock) | **POST** /api/v1/insight/articles/{articleId}/unlock | |

# **getMyBudget**
> BaseResponseReadingBudgetResponse getMyBudget()


### Example

```typescript
import {
    InsightReadingBudgetApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InsightReadingBudgetApi(configuration);

const { status, data } = await apiInstance.getMyBudget();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**BaseResponseReadingBudgetResponse**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Bearer Token is invalid or no bearer token |  -  |
|**403** | You are authenticated but not allowed authorization |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **unlock**
> BaseResponseArticleUnlockResponse unlock()


### Example

```typescript
import {
    InsightReadingBudgetApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InsightReadingBudgetApi(configuration);

let articleId: string; // (default to undefined)

const { status, data } = await apiInstance.unlock(
    articleId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **articleId** | [**string**] |  | defaults to undefined|


### Return type

**BaseResponseArticleUnlockResponse**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Bearer Token is invalid or no bearer token |  -  |
|**403** | You are authenticated but not allowed authorization |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

