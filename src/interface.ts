import * as BigNum from 'bignumber.js'

export interface ITGIBlock{
  ResourceType: number;
  ResourceGroup: number;
  ResourceInstance: BigNum.BigNumber;
}