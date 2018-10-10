import { expect } from 'chai';
import 'mocha';

import './index'
import { UUID } from './index';

describe('Utils', () => {
    it('should generate guid', () => {
        const result = UUID();
        expect(result).to.not.be.empty;
    });
});

describe('Array', () => {
    it('should make distinct1', () => {        
        expect([1,1,1].distinct()).to.have.lengthOf(1);
        let one = { a : 1};
        expect([one, one].distinct(x => x.a)).to.have.lengthOf(1);
        
    });
});