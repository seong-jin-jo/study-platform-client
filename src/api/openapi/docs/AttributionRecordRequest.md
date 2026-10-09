# AttributionRecordRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**utmSource** | **string** | 유입 매체 이름. 예: naver, instagram | [optional] [default to undefined]
**utmMedium** | **string** | 유입 방식. 예: cpc, organic, referral | [optional] [default to undefined]
**utmCampaign** | **string** | 캠페인 이름 | [optional] [default to undefined]
**firstTouchAt** | **string** | 첫 방문 시각. 없으면 서버 시각을 쓴다 | [optional] [default to undefined]

## Example

```typescript
import { AttributionRecordRequest } from './api';

const instance: AttributionRecordRequest = {
    utmSource,
    utmMedium,
    utmCampaign,
    firstTouchAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
