/**
 * Gimbalabs DRep utilities for fetching voting information
 */

import { getPendingProposalsFromAPI } from './get-proposals';

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
export async function pendingProposalGimbalabsDrepHasNotVotedYet(): Promise<any[]> {
  console.log('🔍 Checking which pending proposals Gimbalabs DRep has not voted on yet...');
  
  try {
    // Get pending proposals and DRep votes in parallel
    const [pendingProposals, drepVotes] = await Promise.all([
      getPendingProposalsFromAPI(),
      getGimbalabsDrepVotes()
    ]);

    console.log(`📋 Found ${pendingProposals.length} pending proposals`);
    console.log(`🗳️ Found ${drepVotes.length} DRep votes`);

    // Create a set of transaction hashes that the DRep has voted on
    const votedTxHashes = new Set(drepVotes.map(vote => vote.tx_hash));

    // Filter pending proposals to find those not voted on
    const unvotedProposals = pendingProposals.filter(proposal => {
      const proposalTxHash = proposal.tx_hash;
      return !votedTxHashes.has(proposalTxHash);
    });

    console.log(`📊 Found ${unvotedProposals.length} pending proposals that Gimbalabs DRep has not voted on yet`);

    return unvotedProposals;
  } catch (error) {
    console.error('❌ Error checking unvoted proposals:', error);
    throw error;
  }
}
/**
 * Fetch proposal metadata (title, abstract) from Blockfrost
 */
export async function fetchProposalMetadata(tx_hash: string, cert_index: number): Promise<{title: string, abstract: string}> {
  try {
    const url = `${process.env.BLOCKFROST_API_URL}/governance/proposals/${tx_hash}/${cert_index}/metadata`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        project_id: process.env.BLOCKFROST_API_KEY as string,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      title: data.json_metadata?.body?.title || 'Untitled Proposal',
      abstract: data.json_metadata?.body?.abstract || '',
    };
  } catch (error) {
    console.error(`❌ Error fetching metadata for ${tx_hash}/${cert_index}:`, error);
    return { title: 'Unknown', abstract: '' };
  }
}

/**
 * Add proposal titles to unvoted proposals
 */
async function enrichProposalsWithTitles(unvotedProposals: any[]): Promise<any[]> {
  return Promise.all(
    unvotedProposals.map(async (proposal) => {
      const meta = await fetchProposalMetadata(proposal.tx_hash, proposal.cert_index);
      console.log('Enriched proposals with titles: fired');
      return {
        ...proposal,
        title: meta.title,
        abstract: meta.abstract,
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
