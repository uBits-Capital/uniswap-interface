import { gql } from '@apollo/client'
import { ChainId } from '@uniswap/sdk-core'
import { useTokenTransactionsQuery } from 'graphql/thegraph/__generated__/types-and-hooks'
import { useCallback, useMemo, useRef } from 'react'

import { chainToApolloClient } from './apollo'

gql`
  query TokenTransactions($address: String!, $first: Int, $skip: Int) {
    swapsAs0: swaps(
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
      where: { token0: $address }
      subgraphError: allow
    ) {
      timestamp
      transaction {
        id
      }
      pool {
        token0 {
          id
          symbol
        }
        token1 {
          id
          symbol
        }
      }
      origin
      amount0
      amount1
      amountUSD
    }
    swapsAs1: swaps(
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
      where: { token1: $address }
      subgraphError: allow
    ) {
      timestamp
      transaction {
        id
      }
      pool {
        token0 {
          id
          symbol
        }
        token1 {
          id
          symbol
        }
      }
      origin
      amount0
      amount1
      amountUSD
    }
  }
`
export function useTokenTransactions(address: string, chainId?: ChainId, first = 25, skip?: number) {
  const apolloClient = chainToApolloClient[chainId || ChainId.MAINNET]
  const { data, loading, fetchMore } = useTokenTransactionsQuery({
    variables: {
      address: address.toLowerCase(),
      first,
      skip,
    },
    client: apolloClient,
  })
  const loadingMore = useRef(false)
  const loadMore = useCallback(
    ({ onComplete }: { onComplete?: () => void }) => {
      if (loadingMore.current) {
        return
      }
      loadingMore.current = true
      fetchMore({
        variables: {
          skip: Math.max(data?.swapsAs0?.length ?? 0, data?.swapsAs1?.length ?? 0),
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev
          onComplete?.()
          const mergedData = {
            swapsAs0: [...prev.swapsAs0, ...fetchMoreResult.swapsAs0],
            swapsAs1: [...prev.swapsAs1, ...fetchMoreResult.swapsAs1],
          }
          loadingMore.current = false
          return mergedData
        },
      })
    },
    [data, fetchMore]
  )

  const transactions = useMemo(
    () => [...(data?.swapsAs0 ?? []), ...(data?.swapsAs1 ?? [])].sort((a, b) => b.timestamp - a.timestamp),
    [data?.swapsAs0, data?.swapsAs1]
  )

  return useMemo(() => {
    return {
      transactions,
      loading,
      loadMore,
    }
  }, [transactions, loading, loadMore])
}
