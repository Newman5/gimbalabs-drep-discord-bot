/**
 * Gimbalabs DRep utilities for fetching voting information
 */

import {
  getPendingProposals,
  getPendingProposalsFromAPI,
} from './get-proposals';

const GIMBALABS_DREP_ID = 'drep1taxuxp3f9yvw5txzssxx54n6qy73r9ecc40c5mx4wthuw3r3mj6';

/**
 * Interface for DRep vote response
 */
interface DRepVote {
  tx_hash: string;
  cert_index: number;
  vote: 'yes' | 'no' | 'abstain';
}

/**
 * Fetch all votes cast by Gimbalabs DRep
 * @returns Promise<DRepVote[]> - Array of votes cast by Gimbalabs DRep
 */
export async function getGimbalabsDrepVotes(): Promise<DRepVote[]> {
  console.log('🗳️ Fetching Gimbalabs DRep votes...');
  
  try {
    const response = await fetch(
      `${process.env.BLOCKFROST_API_URL}/governance/dreps/${GIMBALABS_DREP_ID}/votes`,
      {
        method: 'GET',
        headers: {
          'dmtr-api-key': process.env.API_KEY as string,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    const votes: DRepVote[] = await response.json();
    console.log(`✅ Found ${votes.length} votes from Gimbalabs DRep`);
    
    return votes;
  } catch (error) {
    console.error('❌ Error fetching Gimbalabs DRep votes:', error);
    throw error;
  }
}

/**
 * Check which pending proposals Gimbalabs DRep has not voted on yet
 * @returns Promise<any[]> - Array of pending proposals that haven't been voted on by Gimbalabs DRep
 */
export async function pendingProposalGimbalabsDrepHasNotVotedYet(): Promise<
  any[]
> {
  console.log(
    '🔍 Checking which pending proposals Gimbalabs DRep has not voted on yet...'
  );

  try {
    // Get pending proposals and DRep votes in parallel
    console.log(
      '[pendingProposalGimbalabsDrepHasNotVotedYet] USE_SAMPLE_PROPOSALS=',
      process.env.USE_SAMPLE_PROPOSALS
    );
    const [pendingProposals, drepVotes] = await Promise.all([
      // call the selector (it reads USE_SAMPLE_PROPOSALS if no arg passed)
      getPendingProposals(),
      getGimbalabsDrepVotes(),
    ]);

    console.log(`📋 Found ${pendingProposals.length} pending proposals`);
    console.log(`🗳️ Found ${drepVotes.length} DRep votes`);

    // Create a set of transaction hashes that the DRep has voted on
    const votedTxHashes = new Set(drepVotes.map((vote) => vote.tx_hash));

    // Filter pending proposals to find those not voted on
    const unvotedProposals = pendingProposals.filter((proposal) => {
      const proposalTxHash = proposal.tx_hash;
      return !votedTxHashes.has(proposalTxHash);
    });

    console.log(
      `📊 Found ${unvotedProposals.length} pending proposals that Gimbalabs DRep has not voted on yet`
    );

    return unvotedProposals;
  } catch (error) {
    console.error('❌ Error checking unvoted proposals:', error);
    throw error;
  }
}
/**
 * Fetch proposal metadata (title, abstract) from Blockfrost
 */
export async function fetchProposalMetadata(
  tx_hash: string,
  cert_index: number
): Promise<{ title: string; abstract: string; json_metadata?: any }> {
  const url = `${process.env.BLOCKFROST_API_URL}/governance/proposals/${tx_hash}/${cert_index}/metadata`;
  const apiKey =
    process.env.API_KEY ||
    process.env.BLOCKFROST_API_KEY ||
    process.env.BLOCKFROST_PROJECT_ID;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'dmtr-api-key': apiKey as string,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '<no body>');
      console.error(
        `❌ Metadata fetch failed for ${tx_hash}/${cert_index}: ${response.status} ${response.statusText} - ${body}`
      );
      return { title: 'Unknown', abstract: '', json_metadata: undefined };
    }

    const data = await response.json();

    // some endpoints return json_metadata as a string -> parse if needed
    let meta = data.json_metadata;
    if (typeof meta === 'string') {
      try {
        meta = JSON.parse(meta);
      } catch (e) {
        /* ignore parse error */
      }
    }

    const title = meta?.body?.title || data.title || 'Untitled Proposal';
    const abstract = meta?.body?.abstract || data.abstract || '';
    return { title, abstract, json_metadata: meta };
    console.log(`fetchProposalMetadata gets: ${title} and ${abstract}`);
  } catch (error) {
    console.error(
      `❌ Error fetching metadata for ${tx_hash}/${cert_index}:`,
      error
    );
    return { title: 'Unknown', abstract: '', json_metadata: undefined };
  }
}

/**
 * Add proposal titles to unvoted proposals
 */
async function enrichProposalsWithTitles(
  unvotedProposals: any[]
): Promise<any[]> {
  return Promise.all(
    unvotedProposals.map(async (proposal) => {
      // If the proposal already includes json_metadata, prefer that (and parse if it's a string)
      let metaObj: any = undefined;
      if (proposal.json_metadata) {
        try {
          metaObj =
            typeof proposal.json_metadata === 'string'
              ? JSON.parse(proposal.json_metadata)
              : proposal.json_metadata;
        } catch (e) {
          console.warn(
            `⚠️ Failed to parse proposal.json_metadata for ${proposal.tx_hash}:${proposal.cert_index} — falling back to fetch`
          );
          metaObj = undefined;
        }
      }

      // If no local metadata, fetch it
      let fetchedMeta;
      if (!metaObj) {
        fetchedMeta = await fetchProposalMetadata(
          proposal.tx_hash,
          proposal.cert_index
        );
        metaObj = fetchedMeta.json_metadata;
      }

      const title =
        metaObj?.body?.title ||
        proposal.title ||
        fetchedMeta?.title ||
        'Untitled Proposal';
      const abstract =
        metaObj?.body?.abstract ||
        proposal.abstract ||
        fetchedMeta?.abstract ||
        '';

      console.log(
        `Enriched proposal ${proposal.tx_hash}:${proposal.cert_index} -> title: ${title}`
      );

      return {
        ...proposal,
        title,
        abstract,
        json_metadata: metaObj, // attach parsed metadata for downstream use
      };
    })
  );
}

/**
 * Get Discord embeds for pending proposals that Gimbalabs DRep has not voted on yet
 * @param maxProposals - Maximum number of proposals to include (default: 10)
 * @returns Promise<any[]> - Array of formatted Discord embeds
 */
export async function getUnvotedProposalsForDiscord(
  maxProposals: number = 10
): Promise<any[]> {
  try {
    const unvotedProposals = await pendingProposalGimbalabsDrepHasNotVotedYet();
    const enrichedProposals = await enrichProposalsWithTitles(unvotedProposals);
console.log('Enriched proposals with titles:', enrichedProposals);
    if (enrichedProposals.length === 0) {
      return [
        {
          title: '✅ All Caught Up!',
          description: 'Gimbalabs DRep has voted on all pending proposals.',
          color: 0x2ecc71,
          timestamp: new Date().toISOString(),
          footer: {
            text: `Gimbalabs DRep: ${GIMBALABS_DREP_ID.substring(0, 20)}...`,
          },
        },
      ];
    }

    const embeds = [];

    // Summary embed
    embeds.push({
      title: '🔍 Pending Proposals - Votes Needed',
      description: `Found ${enrichedProposals.length} pending proposal(s) that Gimbalabs DRep has not voted on yet.`,
      fields: [
        {
          name: '📊 Total Unvoted',
          value: enrichedProposals.length.toString(),
          inline: true,
        },
        {
          name: '🏛️ DRep ID',
          value: `\`${GIMBALABS_DREP_ID.substring(0, 20)}...\``,
          inline: true,
        },
      ],
      color: 0xf39c12,
      timestamp: new Date().toISOString(),
    });

    // Individual proposal embeds
    enrichedProposals.slice(0, maxProposals).forEach((proposal, index) => {
      embeds.push({
        title: `⏳ Unvoted Proposal #${index + 1}`,
        fields: [
          {
            name: 'Title',
            value: proposal.title,
            inline: false,
          },
          {
            name: 'Transaction Hash',
            value: `\`${proposal.tx_hash.substring(0, 16)}...\``,
            inline: true,
          },
          {
            name: 'Certificate Index',
            value: proposal.cert_index.toString(),
            inline: true,
          },
          {
            name: 'Governance Action',
            value: proposal.governance_action_type || 'Unknown',
            inline: true,
          },
          {
            name: 'Expiry Epoch',
            value: proposal.expiry_epoch?.toString() || 'Unknown',
            inline: true,
          },
          {
            name: 'Deposit (ADA)',
            value: proposal.deposit
              ? `${(parseInt(proposal.deposit) / 1_000_000).toLocaleString()}`
              : 'Unknown',
            inline: true,
          },
        ],
        color: 0xe67e22,
        timestamp: new Date().toISOString(),
      });
    });

    return embeds;
  } catch (error) {
    console.error('❌ Error formatting unvoted proposals for Discord:', error);
    return [
      {
        title: '❌ Error',
        description: 'Failed to fetch unvoted proposals.',
        color: 0xe74c3c,
        timestamp: new Date().toISOString(),
      },
    ];
  }
}


/**
 * Get count of pending proposals that Gimbalabs DRep has not voted on yet
 * @returns Promise<number> - Count of unvoted pending proposals
 */
export async function getUnvotedProposalsCount(): Promise<number> {
  try {
    const unvotedProposals = await pendingProposalGimbalabsDrepHasNotVotedYet();
    return unvotedProposals.length;
  } catch (error) {
    console.error('❌ Error getting unvoted proposals count:', error);
    return 0;
  }
}

/**
 * Get both count and details of pending proposals that Gimbalabs DRep has not voted on yet
 * @returns Promise<{count: number, proposals: any[]}> - Object containing count and proposal details
 */
export async function getUnvotedProposalsInfo(): Promise<{count: number, proposals: any[]}> {
  try {
    const unvotedProposals = await pendingProposalGimbalabsDrepHasNotVotedYet();
    
    return {
      count: unvotedProposals.length,
      proposals: unvotedProposals
    };
  } catch (error) {
    console.error('❌ Error getting unvoted proposals info:', error);
    return {
      count: 0,
      proposals: []
    };
  }
}
