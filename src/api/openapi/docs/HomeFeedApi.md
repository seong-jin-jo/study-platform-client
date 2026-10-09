# HomeFeedApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getFeed**](#getfeed) | **GET** /api/v1/home/feed | |
|[**getPublicFeed**](#getpublicfeed) | **GET** /api/v1/home/public-feed | |

# **getFeed**
> BaseResponseHomeFeedResponse getFeed()


### Example

```typescript
import {
    HomeFeedApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new HomeFeedApi(configuration);

let sort: 'HOT' | 'NEW' | 'TOP'; // (optional) (default to 'HOT')
let cursor: string; // (optional) (default to undefined)
let size: number; // (optional) (default to 20)

const { status, data } = await apiInstance.getFeed(
    sort,
    cursor,
    size
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **sort** | [**&#39;HOT&#39; | &#39;NEW&#39; | &#39;TOP&#39;**]**Array<&#39;HOT&#39; &#124; &#39;NEW&#39; &#124; &#39;TOP&#39;>** |  | (optional) defaults to 'HOT'|
| **cursor** | [**string**] |  | (optional) defaults to undefined|
| **size** | [**number**] |  | (optional) defaults to 20|


### Return type

**BaseResponseHomeFeedResponse**

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

# **getPublicFeed**
> BaseResponsePublicHomeFeedResponse getPublicFeed()


### Example

```typescript
import {
    HomeFeedApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new HomeFeedApi(configuration);

const { status, data } = await apiInstance.getPublicFeed();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**BaseResponsePublicHomeFeedResponse**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

