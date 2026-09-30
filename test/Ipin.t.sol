// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {Ipin} from "../contracts/Ipin.sol";

contract MockUSDC {
    string public name = "USD Coin";
    string public symbol = "USDC";
    uint8 public decimals = 6;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "bal");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "bal");
        require(allowance[from][msg.sender] >= amount, "allow");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract IpinTest is Test {
    MockUSDC usdc;
    Ipin ipin;
    address owner = address(0xA11CE);
    address a = address(0x1);
    address b = address(0x2);

    function setUp() public {
        usdc = new MockUSDC();
        ipin = new Ipin(address(usdc));
        usdc.mint(owner, 1_000_000_000);
        vm.prank(owner);
        usdc.approve(address(ipin), type(uint256).max);
    }

    function _pot() internal returns (uint256 id) {
        address[] memory members = new address[](2);
        members[0] = a;
        members[1] = b;
        uint96[] memory shares = new uint96[](2);
        shares[0] = 50;
        shares[1] = 50;
        vm.prank(owner);
        id = ipin.createPot("crew", members, shares);
    }

    function testCreateAndFundAndPayOnce() public {
        uint256 id = _pot();
        vm.prank(owner);
        ipin.fund(id, 1_000_000);
        vm.prank(owner);
        ipin.pay(id, a);
        assertEq(usdc.balanceOf(a), 500_000);
        vm.prank(owner);
        vm.expectRevert(Ipin.AlreadyPaid.selector);
        ipin.pay(id, a);
    }

    function testPayAllSplits() public {
        uint256 id = _pot();
        vm.prank(owner);
        ipin.fund(id, 1_000_000);
        vm.prank(owner);
        ipin.payAll(id);
        assertEq(usdc.balanceOf(a), 500_000);
        assertEq(usdc.balanceOf(b), 500_000);
    }

    function testStrangerCannotPay() public {
        uint256 id = _pot();
        vm.prank(owner);
        ipin.fund(id, 1_000_000);
        vm.prank(a);
        vm.expectRevert(Ipin.NotOwner.selector);
        ipin.pay(id, a);
    }

    function testAnyoneCanFund() public {
        uint256 id = _pot();
        address donor = address(0xD0);
        usdc.mint(donor, 250_000);
        vm.startPrank(donor);
        usdc.approve(address(ipin), 250_000);
        ipin.fund(id, 250_000);
        vm.stopPrank();
        (,,,,, uint128 bal,,) = ipin.pots(id);
        assertEq(bal, 250_000);
    }
}
