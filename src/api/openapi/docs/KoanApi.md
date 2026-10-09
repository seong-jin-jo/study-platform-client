# KoanApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getCorrections**](#getcorrections) | **GET** /api/v1/koans/{koanId}/corrections | 발행된 화두 정정 이력|
|[**getKoan**](#getkoan) | **GET** /api/v1/koans/{koanId} | 발행된 화두 상세|
|[**getKoans**](#getkoans) | **GET** /api/v1/koans | 발행된 화두 목록|
|[**getSeoDocument1**](#getseodocument1) | **GET** /api/v1/koans/{koanId}/seo-document | 발행된 화두 공개 SEO projection|

# **getCorrections**
> InsightApiResponseListKoanCorrectionResponse getCorrections()


### Example

```typescript
import {
    KoanApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new KoanApi(configuration);

let koanId: number; // (default to undefined)

const { status, data } = await apiInstance.getCorrections(
    koanId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **koanId** | [**number**] |  | defaults to undefined|


### Return type

**InsightApiResponseListKoanCorrectionResponse**

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

# **getKoan**
> InsightApiResponseKoanDetailResponse getKoan()


### Example

```typescript
import {
    KoanApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new KoanApi(configuration);

let koanId: number; // (default to undefined)

const { status, data } = await apiInstance.getKoan(
    koanId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **koanId** | [**number**] |  | defaults to undefined|


### Return type

**InsightApiResponseKoanDetailResponse**

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

# **getKoans**
> InsightApiResponseKoanPageResponse getKoans()


### Example

```typescript
import {
    KoanApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new KoanApi(configuration);

let page: number; // (optional) (default to 1)
let size: number; // (optional) (default to 20)
let categorySlug: string; // (optional) (default to undefined)

const { status, data } = await apiInstance.getKoans(
    page,
    size,
    categorySlug
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **page** | [**number**] |  | (optional) defaults to 1|
| **size** | [**number**] |  | (optional) defaults to 20|
| **categorySlug** | [**string**] |  | (optional) defaults to undefined|


### Return type

**InsightApiResponseKoanPageResponse**

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

# **getSeoDocument1**
> InsightApiResponseKoanSeoDocumentResponse getSeoDocument1()

운영 메모와 검수 정보를 제외한 safe projection

### Example

```typescript
import {
    KoanApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new KoanApi(configuration);

let koanId: number; // (default to undefined)

const { status, data } = await apiInstance.getSeoDocument1(
    koanId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **koanId** | [**number**] |  | defaults to undefined|


### Return type

**InsightApiResponseKoanSeoDocumentResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | 공개 화두 SEO 문서 |  -  |
|**404** | 발행 화두 없음 |  -  |
|**500** | SEO projection 무결성 오류 |  -  |
|**503** | 공개 dependency 일시 장애 |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

